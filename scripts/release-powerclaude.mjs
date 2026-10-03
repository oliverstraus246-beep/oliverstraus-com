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

import { readFile } from "node:fs/promises";
import path from "node:path";
import { releaseProject } from "./lib/release-project.mjs";

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

async function main() {
  const version = await readVersion();
  await releaseProject({ project: PROJECT, sourceDir: SOURCE_DIR, version, include: INCLUDE });
}

await main();
