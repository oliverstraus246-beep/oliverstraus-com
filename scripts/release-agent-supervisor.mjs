// scripts/release-agent-supervisor.mjs
//
// Packages ~/Projects/agent-supervisor into a Mac/Linux tar.gz and a Windows
// zip (identical contents -- only the archive convention differs), uploads
// both to Vercel Blob, and publishes the release in Supabase. Run by hand
// whenever Oliver wants to ship a new AI Agent Supervisor version -- this is
// never triggered by a git push.
//
// Usage: node scripts/release-agent-supervisor.mjs
// Requires BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY in the environment.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { releaseProject } from "./lib/release-project.mjs";

const SOURCE_DIR =
  process.env.AGENT_SUPERVISOR_SOURCE ?? path.join(process.env.HOME, "Projects", "agent-supervisor");
const PROJECT = "agent-supervisor";

// What an end user needs to `uv pip install` and run the CLI: the package
// source, the pyproject.toml that defines the install/entry points, and the
// README for setup instructions. Deliberately excludes .git, .venv (a local
// virtualenv, huge and non-portable), .pytest_cache, CLAUDE.md (this
// project's own dev-context file, not meant for end users -- same reasoning
// as PowerClaude's CLAUDE.md exclusion), tests/ and eval/ (dev/validation
// tooling an end user installing the CLI doesn't need to run it). No
// LICENSE file exists for this project -- none is included or invented.
const INCLUDE = ["src", "pyproject.toml", "README.md"];

async function readVersion() {
  const contents = await readFile(path.join(SOURCE_DIR, "pyproject.toml"), "utf8");
  const match = contents.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error(`Could not find a version in ${path.join(SOURCE_DIR, "pyproject.toml")}`);
  return match[1];
}

async function main() {
  const version = await readVersion();
  await releaseProject({ project: PROJECT, sourceDir: SOURCE_DIR, version, include: INCLUDE });
}

await main();
