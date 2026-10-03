// scripts/lib/release-project.mjs
//
// Shared packaging/upload/publish logic for the project-download feature.
// Packages a source directory into a Mac/Linux tar.gz and a Windows zip
// (identical contents -- only the archive convention differs), uploads both
// to Vercel Blob, and publishes the release in Supabase's download_releases
// table. Fully generic: callers (scripts/release-<project>.mjs) supply the
// project name, source directory, version, and the list of paths to include.
//
// Requires BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY in the environment when actually publishing.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, cp, readdir, readFile, stat, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { zstdCompressSync } from "node:zlib";
import { put } from "@vercel/blob";
import { TarArchive, ZipArchive } from "archiver";

const execFileAsync = promisify(execFile);

// Never worth shipping regardless of which project's INCLUDE list pulled in
// the containing directory -- compiled bytecode caches (Python's
// __pycache__/*.pyc) are machine- and interpreter-version-specific build
// artifacts, not source, and every runtime regenerates them on its own.
function isDisposableArtifact(entryPath) {
  const base = path.basename(entryPath);
  return base === "__pycache__" || base.endsWith(".pyc") || base.endsWith(".pyo");
}

async function stageFiles(sourceDir, include, stagingDir) {
  for (const entry of include) {
    const src = path.join(sourceDir, entry);
    const dest = path.join(stagingDir, entry);
    try {
      await cp(src, dest, {
        recursive: true,
        filter: (source) => !isDisposableArtifact(source),
      });
    } catch (err) {
      console.warn(`  [WARN] skipping missing ${entry}: ${err.message}`);
    }
  }
}

function archiveTo(outPath, stagingDir, format) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    // archiver@8 is ESM-only and no longer exports a default `archiver(format, opts)`
    // factory -- it exports the TarArchive/ZipArchive classes directly. Options
    // (e.g. gzip/gzipOptions) now go to the class constructor instead.
    const archive =
      format === "tar"
        ? new TarArchive({ gzip: true, gzipOptions: { level: 9 } })
        : new ZipArchive();
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(stagingDir, false);
    archive.finalize();
  });
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function dirSizeBytes(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    total += entry.isDirectory() ? await dirSizeBytes(entryPath) : (await stat(entryPath)).size;
  }
  return total;
}

// Both Linux package formats ship the payload at /opt/<project>/ rather than
// scattering files across /usr -- these are personal single-maintainer tools
// with their own internal layout (install.sh expects to find its siblings
// next to it), not packages meant to integrate with a distro's FHS. Returns
// a fresh root containing opt/<project>/<...INCLUDE...>, built from the
// already-staged flat directory `stagingDir` (see packageProject).
async function buildPkgRoot(stagingDir, project) {
  const pkgRoot = await mkdtemp(path.join(tmpdir(), `${project}-pkgroot-`));
  // mkdtemp defaults to 0700 -- that mode would otherwise be recorded as the
  // package's own "./" root entry (both formats archive the whole pkgRoot).
  await chmod(pkgRoot, 0o755);
  const payloadDir = path.join(pkgRoot, "opt", project);
  await mkdir(payloadDir, { recursive: true });
  await cp(stagingDir, payloadDir, { recursive: true });
  return { pkgRoot, payloadDir };
}

// Real .deb, built with dpkg-deb rather than hand-rolled ar/tar -- it's
// installed on this machine and gets the archive member order, compression,
// and control-file validation right for free. postinstMessage is plain
// `echo` lines (no logic): these tools each need a per-user step (run
// install.sh, pip install, register a native messaging host) that a
// postinst running as root during `apt install` cannot safely perform
// itself -- it would write into /root instead of the real user's home. So
// postinst only prints what to run next, the same finishing step the
// tar.gz download already requires users to do by hand.
async function buildDebPackage({ project, version, description, stagingDir, postinstMessage, outPath }) {
  const { pkgRoot, payloadDir } = await buildPkgRoot(stagingDir, project);
  const debianDir = path.join(pkgRoot, "DEBIAN");
  await mkdir(debianDir, { recursive: true });

  const installedSizeKb = Math.ceil((await dirSizeBytes(payloadDir)) / 1024);
  const control = `Package: ${project}
Version: ${version}
Section: utils
Priority: optional
Architecture: all
Maintainer: Oliver Straus <oliverstraus246@gmail.com>
Installed-Size: ${installedSizeKb}
Description: ${description}
`;
  await writeFile(path.join(debianDir, "control"), control);

  const postinstPath = path.join(debianDir, "postinst");
  await writeFile(postinstPath, `#!/bin/sh\nset -e\n${postinstMessage}\nexit 0\n`);
  await chmod(postinstPath, 0o755);

  await execFileAsync("dpkg-deb", ["--build", "--root-owner-group", pkgRoot, outPath]);
  return outPath;
}

// Real Arch package format (what `pacman -U` expects): a zstd-compressed
// tar with .PKGINFO at the archive root alongside the opt/<project>/
// payload. Doesn't use makepkg/pacstrap -- the format itself is just
// tar+zstd+metadata, no Arch-specific toolchain is required to produce one.
// .INSTALL (pacman's postinst equivalent) carries the same
// run-this-yourself message as the .deb's postinst, via post_install().
async function buildArchPackage({ project, version, description, stagingDir, postinstMessage, outPath }) {
  const { pkgRoot, payloadDir } = await buildPkgRoot(stagingDir, project);

  const sizeBytes = await dirSizeBytes(payloadDir);
  const pkginfo = `pkgname = ${project}
pkgbase = ${project}
pkgver = ${version}-1
pkgdesc = ${description}
url = https://oliverstraus.com
builddate = ${Math.floor(Date.now() / 1000)}
packager = Oliver Straus <oliverstraus246@gmail.com>
size = ${sizeBytes}
arch = any
license = custom
`;
  await writeFile(path.join(pkgRoot, ".PKGINFO"), pkginfo);

  const install = `post_install() {\n${postinstMessage}\n}\n\npost_upgrade() {\n  post_install "$1"\n}\n`;
  await writeFile(path.join(pkgRoot, ".INSTALL"), install);

  const tarPath = path.join(tmpdir(), `${project}-${version}-arch.tar`);
  await execFileAsync("tar", [
    "--numeric-owner",
    "--owner=0",
    "--group=0",
    "-cf",
    tarPath,
    "-C",
    pkgRoot,
    ".PKGINFO",
    ".INSTALL",
    "opt",
  ]);
  const compressed = zstdCompressSync(await readFile(tarPath));
  await writeFile(outPath, compressed);
  return outPath;
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

// Phase 1: insert the new release row with is_current:false. Nothing about
// the existing "current" state is touched yet -- if this throws, no
// project+platform has lost its current release.
async function insertPendingRelease(row) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const res = await fetch(`${url}/rest/v1/download_releases`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({ ...row, is_current: false }),
  });
  if (!res.ok) throw new Error(`Failed to insert ${row.project}/${row.platform}: ${res.status}`);
  const [inserted] = await res.json();
  return inserted;
}

// Phase 2: only called once every insert above has succeeded. Retires the
// old current row(s) for this project+platform, then promotes the
// newly-inserted row to is_current:true. Both responses are checked --
// "is_current" must mean exactly one row at a time.
async function promoteRelease(project, platform, newReleaseId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const headers = supabaseHeaders();

  const retireRes = await fetch(
    `${url}/rest/v1/download_releases?project=eq.${project}&platform=eq.${platform}&is_current=eq.true`,
    { method: "PATCH", headers, body: JSON.stringify({ is_current: false }) },
  );
  if (!retireRes.ok) {
    throw new Error(
      `Failed to retire previous current release for ${project}/${platform}: ${retireRes.status}`,
    );
  }

  const promoteRes = await fetch(
    `${url}/rest/v1/download_releases?id=eq.${newReleaseId}`,
    { method: "PATCH", headers, body: JSON.stringify({ is_current: true }) },
  );
  if (!promoteRes.ok) {
    throw new Error(`Failed to promote ${project}/${platform} v${newReleaseId}: ${promoteRes.status}`);
  }
}

// Packages `sourceDir` (only the paths in `include`) into a tar.gz and a zip
// under the system tmpdir, named `<project>-v<version>.<ext>`. Does not
// upload or publish anything -- used by each release script's own dry-run
// verification (tar -tzf / unzip -l) before wiring up real credentials.
export async function packageProject({ project, sourceDir, version, include }) {
  const staging = await mkdtemp(path.join(tmpdir(), `${project}-release-`));
  await stageFiles(sourceDir, include, staging);

  const tarPath = path.join(tmpdir(), `${project}-v${version}.tar.gz`);
  const zipPath = path.join(tmpdir(), `${project}-v${version}.zip`);
  await archiveTo(tarPath, staging, "tar");
  await archiveTo(zipPath, staging, "zip");

  return { staging, tarPath, zipPath };
}

// Packages, uploads to Vercel Blob, and publishes Supabase rows for a single
// project release across mac/linux (tar.gz), windows (zip), debian (.deb),
// and arch (.pkg.tar.zst). description/postinstMessage are required -- every
// project ships real Debian/Arch packages now, not just the generic tarball.
export async function releaseProject({
  project,
  sourceDir,
  version,
  include,
  description,
  postinstMessage,
}) {
  console.log(`Releasing ${project} v${version}...`);

  const { staging, tarPath, zipPath } = await packageProject({ project, sourceDir, version, include });

  const debPath = path.join(tmpdir(), `${project}_${version}_all.deb`);
  const archPath = path.join(tmpdir(), `${project}-${version}-1-any.pkg.tar.zst`);
  await buildDebPackage({ project, version, description, stagingDir: staging, postinstMessage, outPath: debPath });
  await buildArchPackage({ project, version, description, stagingDir: staging, postinstMessage, outPath: archPath });

  const artifacts = {
    mac: { path: tarPath, name: `${project}-v${version}.tar.gz` },
    linux: { path: tarPath, name: `${project}-v${version}.tar.gz` },
    windows: { path: zipPath, name: `${project}-v${version}.zip` },
    debian: { path: debPath, name: `${project}_${version}_all.deb` },
    arch: { path: archPath, name: `${project}-${version}-1-any.pkg.tar.zst` },
  };

  console.log("Uploading to Vercel Blob...");
  const uploaded = {};
  // mac and linux are the same tar.gz -- upload it once, reuse the blob URL.
  for (const [platform, { path: filePath, name }] of Object.entries(artifacts)) {
    if (platform === "linux" && uploaded.mac) {
      uploaded.linux = uploaded.mac;
      continue;
    }
    const fileStat = await stat(filePath);
    const fileSha = await sha256(filePath);
    const blob = await put(`${project}/v${version}/${name}`, await readFile(filePath), { access: "public" });
    uploaded[platform] = { blob, sha: fileSha, size: fileStat.size };
  }

  console.log("Publishing to Supabase...");

  // Phase 1: insert every new release row as is_current:false first. If any
  // insert fails, we abort here -- before touching any existing is_current
  // state -- so a partial failure never leaves a platform without a current
  // release.
  const pending = Object.entries(uploaded).map(([platform, { blob, sha, size }]) => ({
    platform,
    row: { project, platform, version, blob_url: blob.url, sha256: sha, size_bytes: size },
  }));

  const inserted = [];
  for (const { platform, row } of pending) {
    const newRelease = await insertPendingRelease(row);
    inserted.push({ platform, id: newRelease.id });
  }

  // Phase 2: all inserts succeeded -- now promote each new row to current,
  // retiring whatever was previously current for that project+platform.
  for (const { platform, id } of inserted) {
    await promoteRelease(project, platform, id);
  }

  console.log(`Done. v${version} is now live for mac, linux, windows, debian, and arch.`);
  for (const [platform, { blob, sha }] of Object.entries(uploaded)) {
    console.log(`  ${platform}: ${blob.url} (${sha.slice(0, 12)}...)`);
  }
}
