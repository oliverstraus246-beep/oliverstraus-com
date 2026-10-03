// scripts/release-powerclaude.mjs
//
// Packages ~/Projects/powerclaude into a Mac/Linux tar.gz and a Windows zip
// (identical contents -- only the archive convention differs), uploads both
// to Vercel Blob, and publishes the release in Supabase. Run by hand
// whenever Oliver wants to ship a new PowerClaude version -- this is never
// triggered by a git push.
//
// Usage: node scripts/release-powerclaude.mjs
// Requires BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY in the environment.

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, cp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { put } from "@vercel/blob";
import { TarArchive, ZipArchive } from "archiver";

const SOURCE_DIR = process.env.POWERCLAUDE_SOURCE ?? path.join(process.env.HOME, "Projects", "powerclaude");
const PROJECT = "powerclaude";

// Exactly what install.sh / install.ps1 read from the repo root, plus the
// human-facing top-level docs. Deliberately excludes .git*, .gitnexus,
// .claude, CLAUDE.md (Oliver's own dev-context file for working ON this
// repo -- not the end-user template, that's CLAUDE.md.template), and
// scripts/ (maintainer-only tooling the installer never reads).
const INCLUDE = [
  "install.sh",
  "install.ps1",
  "update.sh",
  "update.ps1",
  "CLAUDE.md.template",
  "validate.js",
  "api-keys.json.example",
  "settings.json.example",
  "hooks",
  "window-prompts",
  "personalization-engine.md",
  "docs",
  "skill-bundles",
  "vault-templates",
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "TROUBLESHOOTING.md",
];

async function readVersion() {
  try {
    return (await readFile(path.join(SOURCE_DIR, "VERSION"), "utf8")).trim();
  } catch {
    return "0.1.0";
  }
}

async function stageFiles(stagingDir) {
  for (const entry of INCLUDE) {
    const src = path.join(SOURCE_DIR, entry);
    const dest = path.join(stagingDir, entry);
    try {
      await cp(src, dest, { recursive: true });
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

async function upsertRelease(row) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  // Retire any previous current release for this project+platform first --
  // "is_current" must mean exactly one row at a time.
  await fetch(
    `${url}/rest/v1/download_releases?project=eq.${row.project}&platform=eq.${row.platform}&is_current=eq.true`,
    { method: "PATCH", headers, body: JSON.stringify({ is_current: false }) },
  );

  const res = await fetch(`${url}/rest/v1/download_releases`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Failed to publish ${row.project}/${row.platform}: ${res.status}`);
}

async function main() {
  const version = await readVersion();
  console.log(`Releasing PowerClaude v${version}...`);

  const staging = await mkdtemp(path.join(tmpdir(), "powerclaude-release-"));
  await stageFiles(staging);

  const tarPath = path.join(tmpdir(), `powerclaude-v${version}.tar.gz`);
  const zipPath = path.join(tmpdir(), `powerclaude-v${version}.zip`);
  await archiveTo(tarPath, staging, "tar");
  await archiveTo(zipPath, staging, "zip");

  const tarStat = await stat(tarPath);
  const zipStat = await stat(zipPath);
  const tarSha = await sha256(tarPath);
  const zipSha = await sha256(zipPath);

  console.log("Uploading to Vercel Blob...");
  const tarBlob = await put(
    `powerclaude/v${version}/powerclaude-v${version}.tar.gz`,
    await readFile(tarPath),
    { access: "public" },
  );
  const zipBlob = await put(
    `powerclaude/v${version}/powerclaude-v${version}.zip`,
    await readFile(zipPath),
    { access: "public" },
  );

  console.log("Publishing to Supabase...");
  for (const platform of ["mac", "linux"]) {
    await upsertRelease({
      project: PROJECT,
      platform,
      version,
      blob_url: tarBlob.url,
      sha256: tarSha,
      size_bytes: tarStat.size,
      is_current: true,
    });
  }
  await upsertRelease({
    project: PROJECT,
    platform: "windows",
    version,
    blob_url: zipBlob.url,
    sha256: zipSha,
    size_bytes: zipStat.size,
    is_current: true,
  });

  console.log(`Done. v${version} is now live for mac, linux, and windows.`);
  console.log(`  tar.gz: ${tarBlob.url} (${tarSha.slice(0, 12)}...)`);
  console.log(`  zip:    ${zipBlob.url} (${zipSha.slice(0, 12)}...)`);
}

await main();
