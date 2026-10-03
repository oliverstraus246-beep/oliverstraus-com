# PowerClaude Download Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor on `/work/powerclaude` click Download, pick Mac/Linux/Windows, and get the right PowerClaude archive — with the download logged for Oliver's own admin dashboard, and without touching any other venture.

**Architecture:** PowerClaude's repo is packaged (by a manual release script) into a `.tar.gz` (Mac/Linux) and a `.zip` (Windows), uploaded to Vercel Blob, and tracked in two new Supabase tables (`download_releases`, `download_events`) using this project's existing service-role-key REST pattern. A dark-themed OS-picker modal (reusing the résumé modal's interaction model, not its look) links to a new `/api/download/[project]` route handler that looks up the current release, logs the click, and 302-redirects to the Blob URL — no CSP changes needed since that's a navigation, not a fetch.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), TypeScript, Supabase REST API (service-role key), Vercel Blob, Zod, Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-10-02-project-download-feature-design.md](../specs/2026-10-02-project-download-feature-design.md)

## Global Constraints

- No GitHub Releases, GitHub Actions, or GitHub-hosted distribution anywhere in this feature — Oliver's GitHub account is flagged; GitLab/self-hosted only.
- `download_events` stores `ip_hash` only, never a raw IP — matches every table on this site except `page_views`. Do not widen this without Oliver separately deciding to revisit `/privacy`'s own stated practice.
- The Download button must only ever render when `venture.downloads` is explicitly set on that venture's `ventures.ts` entry. Today that's exactly one venture: `powerclaude`.
- Cutting a release is a deliberate, manual script run — never triggered by a git push.
- No new CSP directives. If a step seems to need one, stop — it means the design assumption (redirect, not fetch) broke somewhere.
- Match existing code style exactly: server components fetch Supabase REST directly with `supabaseReadHeaders`/raw `fetch`, no ORM; monospace uppercase tracking-widest labels + `accent-blue` hover states for anything UI-facing; `rounded-2xl border border-border bg-card` for cards/panels.

---

### Task 1: Supabase schema — `download_releases` + `download_events`

**Files:**
- Modify: `supabase/schema.sql` (append)

**Interfaces:**
- Produces: `download_releases` table (`id`, `project`, `platform`, `version`, `blob_url`, `sha256`, `size_bytes`, `is_current`, `created_at`) and `download_events` table (`id`, `project`, `platform`, `version`, `ip_hash`, `user_agent`, `created_at`), both RLS-enabled, zero policies — queried via `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` exactly like every other table in this file.

- [ ] **Step 1: Append the new tables to `supabase/schema.sql`**

Add this to the end of the file:

```sql
-- Release artifacts for the project-download feature (src/app/api/download,
-- src/components/download-modal.tsx). Same RLS posture as every other table
-- here: zero policies, service_role-key-only access. One row per
-- (project, platform); is_current marks which row the download route
-- currently serves. scripts/release-powerclaude.mjs is the only writer.
create table if not exists download_releases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project text not null,
  platform text not null,
  version text not null,
  blob_url text not null,
  sha256 text not null,
  size_bytes bigint not null,
  is_current boolean not null default false
);

alter table download_releases enable row level security;

create index if not exists download_releases_current_idx
  on download_releases (project, platform, is_current);

-- One row per click-through on the download route. Written by
-- src/app/api/download/[project]/route.ts. ip_hash only (never a raw IP) --
-- matches every table on this site except page_views, which is a
-- deliberate, separate exception documented on /privacy.
create table if not exists download_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project text not null,
  platform text not null,
  version text not null,
  ip_hash text not null,
  user_agent text
);

alter table download_events enable row level security;

create index if not exists download_events_created_at_idx
  on download_events (created_at);

create index if not exists download_events_project_platform_idx
  on download_events (project, platform);
```

- [ ] **Step 2: Apply it to the live Supabase project**

Use the Supabase MCP tool against the `oliverstraus-com` project (id `wkdgnzdthtqnlimjrkna` — confirm with `list_projects`/`get_project` first in case the id has changed) to run the exact SQL block above via its `execute_sql` equivalent. This mirrors how every prior table in this file was actually applied (the file is a record of what was run, not itself executed by the app).

- [ ] **Step 3: Verify**

Query the project's table list (the Supabase MCP's list-tables equivalent) and confirm `download_releases` and `download_events` both appear with RLS enabled.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "Add download_releases and download_events tables"
```

---

### Task 2: `src/lib/downloads.ts` — platform validation + release selection

**Files:**
- Create: `src/lib/downloads.ts`
- Test: `src/lib/downloads.test.ts`

**Interfaces:**
- Produces: `PLATFORMS` (`readonly ["mac", "linux", "windows"]`), `Platform` type, `isPlatform(value: string | null): value is Platform`, `DownloadReleaseRow` interface, `pickCurrentRelease(rows: DownloadReleaseRow[], project: string, platform: Platform): DownloadReleaseRow | null`.
- Consumed by: Task 5 (route handler), Task 7 (modal's platform list).

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/downloads.test.ts
import { describe, it, expect } from "vitest"
import { isPlatform, pickCurrentRelease, PLATFORMS, type DownloadReleaseRow } from "./downloads"

describe("isPlatform", () => {
  it("accepts mac, linux, windows", () => {
    for (const p of PLATFORMS) expect(isPlatform(p)).toBe(true)
  })

  it("rejects anything else, including null", () => {
    expect(isPlatform("solaris")).toBe(false)
    expect(isPlatform(null)).toBe(false)
    expect(isPlatform("")).toBe(false)
  })
})

function row(overrides: Partial<DownloadReleaseRow> = {}): DownloadReleaseRow {
  return {
    id: "1",
    project: "powerclaude",
    platform: "mac",
    version: "1.0.0",
    blob_url: "https://blob.example/powerclaude-v1.0.0.tar.gz",
    sha256: "abc",
    size_bytes: 1024,
    is_current: true,
    created_at: "2026-10-02T00:00:00.000Z",
    ...overrides,
  }
}

describe("pickCurrentRelease", () => {
  it("returns the matching current row for the given project+platform", () => {
    const rows = [row(), row({ platform: "windows", id: "2" })]
    expect(pickCurrentRelease(rows, "powerclaude", "mac")?.id).toBe("1")
  })

  it("ignores a matching row that isn't current", () => {
    const rows = [row({ is_current: false })]
    expect(pickCurrentRelease(rows, "powerclaude", "mac")).toBeNull()
  })

  it("ignores a row for a different project", () => {
    const rows = [row({ project: "other-app" })]
    expect(pickCurrentRelease(rows, "powerclaude", "mac")).toBeNull()
  })

  it("returns null when nothing matches", () => {
    expect(pickCurrentRelease([], "powerclaude", "mac")).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- downloads.test.ts`
Expected: FAIL — `Cannot find module './downloads'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/downloads.ts
export const PLATFORMS = ["mac", "linux", "windows"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string | null): value is Platform {
  return value !== null && (PLATFORMS as readonly string[]).includes(value);
}

export interface DownloadReleaseRow {
  id: string;
  project: string;
  platform: Platform;
  version: string;
  blob_url: string;
  sha256: string;
  size_bytes: number;
  is_current: boolean;
  created_at: string;
}

// Defensive selector -- works whether the caller already filtered the
// Supabase query to project+platform+is_current=true, or handed over a
// broader row set. Used by the download route (Task 5).
export function pickCurrentRelease(
  rows: DownloadReleaseRow[],
  project: string,
  platform: Platform,
): DownloadReleaseRow | null {
  return (
    rows.find((r) => r.project === project && r.platform === platform && r.is_current) ?? null
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- downloads.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/downloads.ts src/lib/downloads.test.ts
git commit -m "Add platform validation and release-selection logic for downloads"
```

---

### Task 3: Vercel Blob storage — dependencies, env var, store provisioning

**Files:**
- Modify: `package.json` (add `@vercel/blob`, `archiver` to `devDependencies`)
- Modify: `.env.example` (document `BLOB_READ_WRITE_TOKEN`)
- Modify: `.env.local` (add the real token once provisioned)

**Interfaces:**
- Produces: `BLOB_READ_WRITE_TOKEN` env var, available to Task 4's release script via `process.env`.

- [ ] **Step 1: Install the dependencies**

```bash
npm install -D @vercel/blob archiver
```

- [ ] **Step 2: Provision a Vercel Blob store and link it to this project**

Use the Vercel MCP tools: find this project with `get_project`/`list_projects` (name `oliverstraus-com`), then create a Blob store with the storage-stores-blob creation tool and connect it to the project. This auto-populates `BLOB_READ_WRITE_TOKEN` in the Vercel project's environment variables.

- [ ] **Step 3: Pull the token into local dev**

```bash
vercel env pull .env.local
```

If that doesn't merge cleanly with the existing `.env.local`, add the line manually instead — check what `vercel env pull` actually wrote first, don't overwrite the file blind.

- [ ] **Step 4: Document it in `.env.example`**

Add to `.env.example`:

```bash
# Vercel Blob storage for downloadable project releases (scripts/release-*.mjs
# writes here; the download route only ever reads a blob_url string already
# stored in Supabase, so this token is never needed at request time).
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 5: Verify**

```bash
node -e "console.log(!!process.env.BLOB_READ_WRITE_TOKEN)"
```

Run with `.env.local` sourced (e.g. via `dotenv` or your shell) — expect `true`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "Add Vercel Blob dependency and env var for project downloads"
```

(`.env.local` stays untracked, per `.gitignore` — nothing to commit there.)

---

### Task 4: Release script — package PowerClaude, upload, publish

**Files:**
- Create: `scripts/release-powerclaude.mjs` (in `oliverstraus-com`)
- Create: `/home/oliverstraus/Projects/powerclaude/VERSION` (in the PowerClaude repo — a separate git repo; commit there separately)

**Interfaces:**
- Consumes: `@vercel/blob`'s `put()`, `archiver`, `BLOB_READ_WRITE_TOKEN`/`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env vars.
- Produces: `download_releases` rows for `powerclaude`/`mac`, `powerclaude`/`linux`, `powerclaude`/`windows`, each `is_current = true`.

- [ ] **Step 1: Add a VERSION file to the PowerClaude repo**

```bash
echo "1.0.0" > ~/Projects/powerclaude/VERSION
cd ~/Projects/powerclaude && git add VERSION && git commit -m "Add VERSION file for release packaging"
```

- [ ] **Step 2: Write the release script**

```javascript
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
import archiver from "archiver";

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
    const archive = archiver(format, format === "tar" ? { gzip: true, gzipOptions: { level: 9 } } : {});
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
```

- [ ] **Step 3: Dry-run the packaging step only (no upload yet)**

Temporarily comment out the "Uploading to Vercel Blob" and "Publishing to Supabase" blocks (or add an early `return` after the `archiveTo` calls), then run:

```bash
node scripts/release-powerclaude.mjs
```

Expected: no errors, and two files exist at the printed temp paths. Verify their contents:

```bash
tar -tzf /tmp/powerclaude-v1.0.0.tar.gz | head -20
unzip -l /tmp/powerclaude-v1.0.0.zip | head -20
```

Expected: both listings show `install.sh`, `install.ps1`, `hooks/`, `window-prompts/`, `docs/`, `skill-bundles/`, `vault-templates/`, `README.md`, `LICENSE` — and do NOT show `.git`, `CLAUDE.md`, or `scripts/`.

- [ ] **Step 4: Remove the temporary early return and run it for real**

This step actually uploads and publishes — covered by Task 11's end-to-end cut, not repeated here. For now, just restore the full script (undo the Step 3 edit) so it's ready.

- [ ] **Step 5: Commit**

```bash
git add scripts/release-powerclaude.mjs
git commit -m "Add release script for packaging and publishing PowerClaude downloads"
```

---

### Task 5: Download route handler

**Files:**
- Create: `src/app/api/download/[project]/route.ts`

**Interfaces:**
- Consumes: `isPlatform`, `pickCurrentRelease`, `DownloadReleaseRow` from `@/lib/downloads` (Task 2); `getClientIp`, `hashIp` from `@/lib/security`.
- Produces: `GET /api/download/[project]?platform=mac|linux|windows` — 302 to the current release's `blob_url`, 400 for an invalid platform, 404 when nothing's published yet, 503 when Supabase isn't configured.

- [ ] **Step 1: Write the route handler**

```typescript
// src/app/api/download/[project]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, hashIp } from "@/lib/security";
import { isPlatform, pickCurrentRelease, type DownloadReleaseRow } from "@/lib/downloads";

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ project: string }> },
) {
  const { project } = await params;
  const platform = request.nextUrl.searchParams.get("platform");

  if (!isPlatform(platform)) {
    return new NextResponse("Unknown platform. Use ?platform=mac|linux|windows.", { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return new NextResponse("Downloads aren't configured yet.", { status: 503 });
  }

  const releaseRes = await fetch(
    `${url}/rest/v1/download_releases?select=*&project=eq.${encodeURIComponent(project)}&platform=eq.${platform}&is_current=eq.true`,
    { headers: supabaseHeaders(key), cache: "no-store" },
  );
  const rows = releaseRes.ok ? ((await releaseRes.json()) as DownloadReleaseRow[]) : [];
  const release = pickCurrentRelease(rows, project, platform);

  if (!release) {
    return new NextResponse("Nothing published for this platform yet.", { status: 404 });
  }

  const ip_hash = await hashIp(getClientIp(request));
  // Fire-and-forget: logging must never block or break the actual download,
  // same rule proxy.ts's honeypot logger follows. Unlike that logger, there's
  // no ordering-sensitive counter reading this table, so it isn't awaited.
  void fetch(`${url}/rest/v1/download_events`, {
    method: "POST",
    headers: { ...supabaseHeaders(key), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      project,
      platform,
      version: release.version,
      ip_hash,
      user_agent: request.headers.get("user-agent") ?? null,
    }),
  }).catch(() => {});

  return NextResponse.redirect(release.blob_url, { status: 302 });
}
```

- [ ] **Step 2: Manual verification against a 400 and a 404**

With the dev server running (`npm run dev`):

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/download/powerclaude?platform=solaris"
# Expected: 400
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/download/powerclaude?platform=mac"
# Expected: 404 until Task 11 publishes a real release
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/download
git commit -m "Add download route handler with platform validation and event logging"
```

---

### Task 6: `Venture.downloads` field

**Files:**
- Modify: `src/lib/ventures.ts`

**Interfaces:**
- Produces: `Venture.downloads?: { project: string }`, set only on the `powerclaude` entry.
- Consumed by: Task 8 (sidebar button's conditional render).

- [ ] **Step 1: Add the field to the `Venture` interface**

In `src/lib/ventures.ts`, add alongside the other optional fields (after `repoUrl?: string;`):

```typescript
  // Set only when this venture has a real, published download (see
  // src/components/download-modal.tsx and src/app/api/download). Absent by
  // default -- a venture never gets a Download button just by existing.
  // "project" is the key scripts/release-*.mjs publishes releases under in
  // Supabase's download_releases table, not necessarily == slug.
  downloads?: { project: string };
```

- [ ] **Step 2: Set it on the `powerclaude` entry only**

In the `powerclaude` object inside `VENTURES`, add (next to `repoUrl`):

```typescript
    repoUrl: "https://gitlab.com/oliverstraus/powerclaude",
    downloads: { project: "powerclaude" },
```

- [ ] **Step 3: Verify no other venture has it**

```bash
grep -n "downloads:" src/lib/ventures.ts
```

Expected: exactly one match, on the `powerclaude` entry.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ventures.ts
git commit -m "Add optional downloads field to Venture, set on PowerClaude only"
```

---

### Task 7: Download picker modal

**Files:**
- Create: `src/components/download-modal.tsx`
- Test: `src/components/download-modal.test.tsx`
- Modify: `src/app/layout.tsx` (mount it once, alongside `<ResumeModal />`)

**Interfaces:**
- Consumes: `PLATFORMS` from `@/lib/downloads` (Task 2).
- Produces: `openDownload(project: string): void` — any trigger calls this; consumed by Task 8's `DownloadTrigger`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/download-modal.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DownloadModal, openDownload } from "./download-modal"

describe("DownloadModal", () => {
  it("renders nothing until opened", () => {
    render(<DownloadModal />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows all three platform links with the right project+platform in the href", async () => {
    render(<DownloadModal />)
    openDownload("powerclaude")
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /macOS/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=mac",
    )
    expect(screen.getByRole("link", { name: /linux/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=linux",
    )
    expect(screen.getByRole("link", { name: /windows/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=windows",
    )
  })

  it("closes on Escape", async () => {
    const user = userEvent.setup()
    render(<DownloadModal />)
    openDownload("powerclaude")
    await screen.findByRole("dialog")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- download-modal.test.tsx`
Expected: FAIL — `Cannot find module './download-modal'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/download-modal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { PLATFORMS, type Platform } from "@/lib/downloads";

const OPEN_EVENT = "open-download";

const PLATFORM_LABELS: Record<Platform, string> = {
  mac: "macOS",
  linux: "Linux",
  windows: "Windows",
};

/** Any trigger point calls this instead of linking to a download URL directly. */
export function openDownload(project: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { project } }));
}

/**
 * Mounted once (see layout.tsx). Reuses the résumé modal's interaction
 * model -- global open event, focus trap, Escape-to-close, scroll lock,
 * focus restoration -- but a dark, site-matching look instead of the
 * résumé's deliberately light, paper-like surface.
 */
export function DownloadModal() {
  const [project, setProject] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ project: string }>).detail;
      setProject(detail.project);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!project) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setProject(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [project]);

  useEffect(() => {
    if (!project) return;
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const p = panelRef.current;
      if (!p) return;
      const nodes = Array.from(
        p.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((n) => {
        const rect = n.getBoundingClientRect();
        return n.offsetParent !== null && rect.width > 0 && rect.height > 0;
      });
      if (!nodes.length) {
        e.preventDefault();
        p.focus();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === p) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onTab);
    return () => {
      window.removeEventListener("keydown", onTab);
      document.body.style.overflow = prevOverflow;
      const prev = previousFocusRef.current;
      if (prev && document.contains(prev)) {
        try {
          prev.focus();
        } catch {
          /* no longer focusable */
        }
      }
    };
  }, [project]);

  if (!project) return null;

  return (
    <div
      className="animate-modal-backdrop-in fixed inset-0 z-[95] flex items-start justify-center bg-background/80 px-6 pt-[15vh] backdrop-blur-sm"
      onClick={() => setProject(null)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Download PowerClaude"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-panel-in w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Choose your OS
          </p>
          <button
            type="button"
            onClick={() => setProject(null)}
            aria-label="Close"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
          >
            Close
          </button>
        </div>
        <div className="flex flex-col gap-3 p-5">
          {PLATFORMS.map((platform) => (
            <a
              key={platform}
              href={`/api/download/${project}?platform=${platform}`}
              className="flex items-center justify-between rounded-full border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-foreground/80 transition-colors hover:border-accent-blue hover:text-accent-blue active:scale-[0.98]"
            >
              {PLATFORM_LABELS[platform]}
              <span aria-hidden="true">&rarr;</span>
            </a>
          ))}
        </div>
        <p className="border-t border-border px-5 py-4 text-xs leading-relaxed text-muted-foreground">
          By downloading, you agree to the{" "}
          <a
            href="https://gitlab.com/oliverstraus/powerclaude/-/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            className="text-accent-blue hover:text-accent-blue-dim"
          >
            MIT License
          </a>{" "}
          and our{" "}
          <a href="/terms" className="text-accent-blue hover:text-accent-blue-dim">
            Terms
          </a>
          .
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- download-modal.test.tsx`
Expected: PASS, 3 tests

- [ ] **Step 5: Mount it in the layout**

In `src/app/layout.tsx`, next to the existing `<ResumeModal />`:

```typescript
import { DownloadModal } from "@/components/download-modal";
```

```tsx
        <ResumeModal />
        <DownloadModal />
```

- [ ] **Step 6: Commit**

```bash
git add src/components/download-modal.tsx src/components/download-modal.test.tsx src/app/layout.tsx
git commit -m "Add dark-themed OS-picker download modal"
```

---

### Task 8: Download trigger on the venture detail page

**Files:**
- Create: `src/components/download-trigger.tsx`
- Modify: `src/app/work/[slug]/page.tsx`

**Interfaces:**
- Consumes: `openDownload` from `@/components/download-modal` (Task 7); `venture.downloads` from `@/lib/ventures` (Task 6).

- [ ] **Step 1: Write the trigger component**

```tsx
// src/components/download-trigger.tsx
"use client";

import { openDownload } from "@/components/download-modal";

/** Small client island so the (server-rendered) venture detail page can
 * still dispatch the download-modal's open event. */
export function DownloadTrigger({ project }: { project: string }) {
  return (
    <button
      type="button"
      onClick={() => openDownload(project)}
      className="inline-flex items-center gap-1.5 self-start rounded-full border border-border bg-card px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground/80 transition-colors hover:border-accent-blue hover:text-accent-blue active:scale-[0.98]"
    >
      Download
      <span aria-hidden="true">&rarr;</span>
    </button>
  );
}
```

- [ ] **Step 2: Wire it into the detail page sidebar**

In `src/app/work/[slug]/page.tsx`, add the import:

```typescript
import { DownloadTrigger } from "@/components/download-trigger";
```

In the `<aside>` block, immediately before the existing `{venture.repoUrl && (...)}` block, add:

```tsx
          {venture.downloads && (
            <DownloadTrigger project={venture.downloads.project} />
          )}

```

- [ ] **Step 3: Manual verification**

Run the dev server, visit `http://localhost:3000/work/powerclaude`. Expected: a "Download" button appears in the sidebar. Visit `http://localhost:3000/work/sectra` (or any other venture) and confirm no Download button appears there.

- [ ] **Step 4: Commit**

```bash
git add src/components/download-trigger.tsx src/app/work/\[slug\]/page.tsx
git commit -m "Add Download button to venture detail page, gated on venture.downloads"
```

---

### Task 9: Legal — shared Section component, Terms page, Privacy update

**Files:**
- Create: `src/components/legal-section.tsx`
- Modify: `src/app/privacy/page.tsx` (use the shared component; add a new section)
- Create: `src/app/terms/page.tsx`
- Modify: `src/components/footer.tsx` (add a Terms link)

**Interfaces:**
- Produces: `LegalSection({ title, children })` component, shared by `/privacy` and `/terms`.

- [ ] **Step 1: Extract the shared section component**

```tsx
// src/components/legal-section.tsx
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Update `/privacy` to use it, and add the new section**

In `src/app/privacy/page.tsx`:
1. Remove the local `function Section(...)` definition.
2. Add `import { LegalSection } from "@/components/legal-section";` at the top.
3. Rename every `<Section` usage (both opening and closing tags) to `<LegalSection`.
4. Add this new section right before the closing `</main>`:

```tsx
      <LegalSection title="If you download a project">
        <p>
          Downloading a project (PowerClaude, so far) from this site logs the platform you
          picked (Mac/Linux/Windows), the version served, your IP hash, and your User-Agent
          — the same salted-hash-only approach as everything else on this site except page
          views. It exists to see which platforms people actually use and to catch abuse of
          the download endpoint. Never sold, never shared.
        </p>
      </LegalSection>
```

- [ ] **Step 3: Create the Terms page**

```tsx
// src/app/terms/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection } from "@/components/legal-section";

const DESCRIPTION =
  "What you're agreeing to by using this site or downloading something from it -- short, no boilerplate.";

export const metadata: Metadata = {
  title: "Terms",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms | Oliver Straus",
    description: DESCRIPTION,
    url: "https://oliverstraus.com/terms",
    siteName: "Oliver Straus",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms | Oliver Straus",
    description: DESCRIPTION,
  },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <Link
        href="/"
        className="inline-flex items-center py-1.5 -my-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
      >
        &larr; Back
      </Link>

      <h1 className="mt-6 text-3xl font-black tracking-tight">Terms</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated October 2026. Covers using this site and downloading anything from it.
      </p>

      <LegalSection title="Using this site">
        <p>
          This is Oliver Straus&apos;s personal site. Browsing it, reading it, and reaching
          out through the contact form is free to do and comes with no obligations beyond the
          ordinary: don&apos;t attack it, don&apos;t scrape it to republish as your own,
          don&apos;t abuse the contact form. See{" "}
          <Link href="/privacy" className="text-accent-blue hover:text-accent-blue-dim">
            Privacy
          </Link>{" "}
          for what&apos;s actually collected while you do.
        </p>
      </LegalSection>

      <LegalSection title="Downloading a project">
        <p>
          Projects offered for download here (PowerClaude, so far) ship under their own
          open-source license — PowerClaude&apos;s is MIT, included in the download and in
          its repository. That license, not this page, governs what you can do with the
          code.
        </p>
        <p>
          The software is provided as-is, with no warranty of any kind, express or implied.
          Oliver isn&apos;t liable for anything that happens from running it on your own
          machine. This isn&apos;t unusual for open-source software — it&apos;s the same
          disclaimer the MIT license itself already carries.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this page stops matching how this site or its downloads actually work, it gets
          fixed — same standard as the Privacy page.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms:{" "}
          <a
            href="mailto:oliverstraus@proton.me"
            className="text-accent-blue hover:text-accent-blue-dim"
          >
            oliverstraus@proton.me
          </a>
          .
        </p>
      </LegalSection>
    </main>
  );
}
```

- [ ] **Step 4: Add a footer link**

In `src/components/footer.tsx`, next to the existing Privacy link:

```tsx
            <Link href="/privacy" className="transition-colors hover:text-accent-blue">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-accent-blue">
              Terms
            </Link>
```

- [ ] **Step 5: Run the full test suite to confirm nothing on `/privacy` broke**

Run: `npm test`
Expected: all existing tests still pass (the `Section` → `LegalSection` rename is a pure rename, no behavior change).

- [ ] **Step 6: Commit**

```bash
git add src/components/legal-section.tsx src/app/privacy/page.tsx src/app/terms/page.tsx src/components/footer.tsx
git commit -m "Add Terms page, extract shared LegalSection, document download logging on Privacy"
```

---

### Task 10: Admin downloads page

**Files:**
- Create: `src/app/admin/downloads/page.tsx`
- Modify: `src/app/admin/page.tsx` (add overview stat + tool card)

**Interfaces:**
- Consumes: `countBy`, `supabaseReadHeaders` from `@/lib/admin-stats`.

- [ ] **Step 1: Write the admin downloads page**

```tsx
// src/app/admin/downloads/page.tsx
import { countBy, supabaseReadHeaders } from "@/lib/admin-stats";

// Never prerendered (auth-gated, needs a live DB read every time).
export const dynamic = "force-dynamic";

interface DownloadEventRow {
  id: string;
  created_at: string;
  project: string;
  platform: string;
  version: string;
}

interface DownloadReleaseRow {
  project: string;
  platform: string;
  version: string;
  size_bytes: number;
  created_at: string;
}

async function getDownloadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const headers = supabaseReadHeaders(key);
  const [countRes, eventsRes, releasesRes] = await Promise.all([
    fetch(`${url}/rest/v1/download_events?select=id`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact" },
      cache: "no-store",
    }),
    fetch(`${url}/rest/v1/download_events?select=*&order=created_at.desc&limit=500`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${url}/rest/v1/download_releases?select=*&is_current=eq.true&order=platform.asc`, {
      headers,
      cache: "no-store",
    }),
  ]);

  const totalDownloads = Number(countRes.headers.get("content-range")?.split("/")[1] ?? 0);
  const events = eventsRes.ok ? ((await eventsRes.json()) as DownloadEventRow[]) : [];
  const releases = releasesRes.ok ? ((await releasesRes.json()) as DownloadReleaseRow[]) : [];
  const byPlatform = countBy(
    events.map((e) => e.platform),
    "unknown",
  );

  return { totalDownloads, events, releases, byPlatform };
}

export default async function AdminDownloadsPage() {
  const data = await getDownloadData();

  if (!data) {
    return (
      <>
        <h1 className="text-3xl font-black tracking-tight">Downloads</h1>
        <p className="mt-8 text-sm text-muted-foreground">Supabase isn&apos;t configured yet.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">Downloads</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Who&apos;s downloading which project, on which platform, and what&apos;s currently published.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Total downloads
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-foreground">
            {data.totalDownloads.toLocaleString()}
          </p>
        </div>
        {data.byPlatform.map(([platform, count]) => (
          <div key={platform} className="rounded-lg border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {platform}
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight text-foreground">{count}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Currently published
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Project</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Platform</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Version</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Size</th>
            </tr>
          </thead>
          <tbody>
            {data.releases.map((r) => (
              <tr key={`${r.project}-${r.platform}`} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{r.project}</td>
                <td className="px-4 py-2">{r.platform}</td>
                <td className="px-4 py-2">{r.version}</td>
                <td className="px-4 py-2">{(r.size_bytes / 1024 / 1024).toFixed(1)} MB</td>
              </tr>
            ))}
            {data.releases.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                  Nothing published yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Recent downloads
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">When</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Project</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Platform</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Version</th>
            </tr>
          </thead>
          <tbody>
            {data.events.slice(0, 100).map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">{e.project}</td>
                <td className="px-4 py-2">{e.platform}</td>
                <td className="px-4 py-2">{e.version}</td>
              </tr>
            ))}
            {data.events.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                  No downloads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add it to the admin home overview**

In `src/app/admin/page.tsx`:

1. In `getOverview()`'s `Promise.all` array, add a new count fetch and destructure it:

```typescript
  const [totalViews, contacts, blockedIps, honeypot24h, downloads, activeRes, blockedRes, recentViewsRes, recentHoneypotRes] =
    await Promise.all([
      headCount("page_views"),
      headCount("contact_submissions"),
      headCount("blocked_ips"),
      headCount("honeypot_hits", `&created_at=gte.${dayAgo}`),
      headCount("download_events"),
      fetch(`${url}/rest/v1/page_views?select=ip_hash&duration_ms=is.null&created_at=gte.${fiveMinAgo}`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/blocked_ips?select=ip_hash`, { headers: supabaseReadHeaders(key), cache: "no-store" }),
      fetch(`${url}/rest/v1/page_views?select=ip_hash,created_at&order=created_at.desc&limit=5000`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/honeypot_hits?select=ip_hash,created_at&order=created_at.desc&limit=2000`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
    ]);
```

2. Add `downloads: exactCount(downloads),` to the returned object.

3. Add a new `<OverviewStat>` in the JSX, after "Blocked IPs":

```tsx
          <OverviewStat label="Downloads" value={overview.downloads.toLocaleString()} />
```

4. Add a fourth `<ToolCard>`, after "Security":

```tsx
        <ToolCard
          href="/admin/downloads"
          title="Downloads"
          description="Per-platform download counts, recent events, and what's currently published."
        />
```

- [ ] **Step 3: Manual verification**

Run the dev server, visit `http://localhost:3000/admin/downloads` (after logging in). Expected: page loads with "Supabase isn't configured yet" if env vars are missing locally, or real (possibly zero) counts if they're set. Visit `/admin` and confirm the new stat/card appear.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/downloads src/app/admin/page.tsx
git commit -m "Add admin downloads page with per-platform analytics"
```

---

### Task 11: Cut a real release and verify the full flow end to end

**Files:** none new — this exercises everything built in Tasks 1–10 against live infrastructure.

- [ ] **Step 1: Run the full test suite and lint**

```bash
npm test
npm run lint
```

Expected: everything passes.

- [ ] **Step 2: Cut the actual v1.0.0 release**

With `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` set in the environment:

```bash
node scripts/release-powerclaude.mjs
```

Expected: prints the tar.gz and zip Blob URLs, no errors.

- [ ] **Step 3: Verify the release rows in Supabase**

Query `download_releases` (via the Supabase MCP tool or the admin page built in Task 10) and confirm three rows exist for `project = powerclaude`, one each for `mac`, `linux`, `windows`, all `is_current = true`.

- [ ] **Step 4: Click through the real flow in the browser preview**

1. Open `/work/powerclaude`.
2. Click "Download" — the modal should open with the dark site-matching look, three OS buttons, and the "agree to the MIT License and our Terms" line with working links.
3. Click each of Mac/Linux/Windows in turn (in separate tabs, or check `Network` after each) and confirm each one 302-redirects to a real Blob URL and the browser starts downloading a file.
4. Press Escape with the modal open — confirm it closes and focus returns to the Download button.
5. Open `/admin/downloads` and confirm the 3 clicks from step 2 show up in "Recent downloads" and the per-platform counts.
6. Open `/terms` and `/privacy` and confirm both render, and the footer's new Terms link works from the homepage.

- [ ] **Step 5: Confirm scope containment**

Visit 2–3 other venture detail pages (e.g. `/work/sectra`, `/work/the-reaper`) and confirm neither shows a Download button.

- [ ] **Step 6: Report to Oliver**

Summarize: what got built, the live `/work/powerclaude` Download flow, the new `/admin/downloads` page, and the new Vercel Blob store now on his account (so it's never a surprise in his dashboard).

---

## Self-Review Notes

- **Spec coverage:** Storage (Task 3–4), versioning/pointer table (Task 1, 4), delivery route (Task 5), analytics (Task 1, 5, 10), scope guard (Task 6), UI/modal (Task 7–8), legal (Task 9) — every spec section has a task.
- **Placeholder scan:** no TBD/TODO; every code block is complete, runnable code.
- **Type consistency:** `Platform`/`PLATFORMS`/`isPlatform`/`DownloadReleaseRow`/`pickCurrentRelease` (Task 2) are the exact names and signatures reused unchanged in Tasks 5, 7, 10. `openDownload(project: string)` (Task 7) matches its one caller in Task 8. `venture.downloads.project` (Task 6) matches the prop passed into `DownloadTrigger` (Task 8) and the route path built in Task 7's modal.
