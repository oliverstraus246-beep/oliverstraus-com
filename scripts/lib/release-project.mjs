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

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, cp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { put } from "@vercel/blob";
import { TarArchive, ZipArchive } from "archiver";

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
// project release across mac/linux (tar.gz) and windows (zip).
export async function releaseProject({ project, sourceDir, version, include }) {
  console.log(`Releasing ${project} v${version}...`);

  const { tarPath, zipPath } = await packageProject({ project, sourceDir, version, include });

  const tarStat = await stat(tarPath);
  const zipStat = await stat(zipPath);
  const tarSha = await sha256(tarPath);
  const zipSha = await sha256(zipPath);

  console.log("Uploading to Vercel Blob...");
  const tarBlob = await put(
    `${project}/v${version}/${project}-v${version}.tar.gz`,
    await readFile(tarPath),
    { access: "public" },
  );
  const zipBlob = await put(
    `${project}/v${version}/${project}-v${version}.zip`,
    await readFile(zipPath),
    { access: "public" },
  );

  console.log("Publishing to Supabase...");

  // Phase 1: insert every new release row (mac, linux, windows) as
  // is_current:false first. If any insert fails, we abort here -- before
  // touching any existing is_current state -- so a partial failure never
  // leaves a platform without a current release.
  const pending = [];
  for (const platform of ["mac", "linux"]) {
    pending.push({
      platform,
      row: {
        project,
        platform,
        version,
        blob_url: tarBlob.url,
        sha256: tarSha,
        size_bytes: tarStat.size,
      },
    });
  }
  pending.push({
    platform: "windows",
    row: {
      project,
      platform: "windows",
      version,
      blob_url: zipBlob.url,
      sha256: zipSha,
      size_bytes: zipStat.size,
    },
  });

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

  console.log(`Done. v${version} is now live for mac, linux, and windows.`);
  console.log(`  tar.gz: ${tarBlob.url} (${tarSha.slice(0, 12)}...)`);
  console.log(`  zip:    ${zipBlob.url} (${zipSha.slice(0, 12)}...)`);
}
