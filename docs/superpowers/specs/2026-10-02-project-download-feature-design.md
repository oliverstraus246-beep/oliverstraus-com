# 2026-10-02 — Project download feature (PowerClaude first)

## Context

Oliver wants a download action on a venture's detail page: click it, pick
your OS (Mac/Linux/Windows), get the right file. PowerClaude
(`~/Projects/powerclaude`) is the first and, for now, *only* venture this
applies to — it's explicitly not a blanket feature. Most of what's in
`~/Projects/` is private, business-sensitive, or not Oliver's to
redistribute (Lead Gen Agency, Atlas, forks), so nothing about this design
should make it easy to accidentally light up a download button on any
other venture.

PowerClaude itself ships no compiled binary. It's a git repo — install
scripts (`install.sh` for Mac/Linux, `install.ps1` for Windows), hooks,
vault templates, skill bundles, window prompts. The three "builds" are the
same content, packaged per OS convention.

Key facts from this session's research:

- **Oliver's GitHub account is flagged.** He migrated his real work to
  GitLab (`gitlab.com/oliverstraus/powerclaude`, currently what
  `ventures.ts`'s `repoUrl` points to) and only touches GitHub to browse
  other people's projects now. GitHub Releases is off the table for
  anything Oliver operates himself — confirmed explicitly, not inferred.
  (PowerClaude's own README still tells *other people* installing it to
  clone from GitHub — that's a separate, public-facing repo and is left
  alone.)
- **The live CSP is not nonce-based.** `src/proxy.ts` uses a static
  `'unsafe-inline'` policy for `script-src`/`style-src` in prod
  deliberately (a nonce broke static prerendering, reverted on purpose —
  see the comment above `buildCspHeader()`). This design needs zero CSP
  changes regardless: the download flow is a server-side redirect
  followed by a browser navigation, which `connect-src` never governs.
- Admin pages (`/admin/security`, `/admin/stats`) already follow one
  pattern: server component, direct `fetch` against Supabase's REST API
  with the service-role key, `HEAD` + `Prefer: count=exact` for counts.
  This design reuses that pattern rather than inventing a new one.
- No Terms page exists yet, only `/privacy` — which is written in first-
  person, exact-schema style ("this page describes exactly what this
  site's code collects... if something below stops being true, this page
  is wrong"). Any new data collection has to get a section there to stay
  honest to that page's own stated premise.

## Decisions

**Storage: Vercel Blob, not GitHub Releases.** Given the GitHub
constraint above, this was close to decided already. A small release
script packages the current PowerClaude tree into three OS-named
archives — `powerclaude-vX.Y.Z-mac.tar.gz`, `-linux.tar.gz`,
`-windows.zip` (identical content, OS-conventional packaging and line
endings) — and uploads them to a Vercel Blob store on this project.
Cutting a release is a deliberate, manual step (Oliver or Claude runs the
script), not triggered by every push — avoids ever publishing
work-in-progress commits as a "release."

**Versioning: a Supabase pointer table, not a hardcoded path.**
`download_releases` holds one row per (project, platform): version,
blob URL, sha256, size, `is_current`. Cutting a new release writes new
rows and flips `is_current`; the download route always reads whichever
row is current. No redeploy needed to ship a new PowerClaude version.

**Delivery: a Route Handler, not a direct Blob link.**
`src/app/api/download/[project]/route.ts` validates `project` + a
`?platform=` query param (zod, matching the `/api/contact` convention),
looks up the current release row, logs a `download_events` row, and
302-redirects to the Blob URL. The OS-picker's buttons are plain
`<a href>` elements pointing at this route — not a `fetch()` — so the
whole thing works without client JS beyond opening the modal, and
nothing here touches `connect-src`.

**Analytics: a new Supabase table, same privacy posture as everything
else on this site.** `download_events` logs `ip_hash` (reusing the
existing `hashIp()` helper), platform, version, user-agent, timestamp —
*not* a raw IP. Oliver asked for "more analytics" tied to a terms
notice; I'm giving him real analytics (this is strictly more visibility
than the zero that exists today) without quietly contradicting
`/privacy`'s own stated hash-only-by-default practice. Raw-IP collection
for downloads would need an actual, deliberate edit to that page's own
promises, not a side effect of a download feature — flagging this
rather than deciding it silently.

**A new `/admin/downloads` page**, server component, same
fetch-Supabase-REST-with-service-role-key pattern as `/admin/security`:
total downloads, breakdown by platform (reusing the `countBy` helper
already in `lib/admin-stats.ts`), a recent-events table, and the
currently published version per platform.

**Scope guard: an optional field on `Venture`, not a global flag.**
`ventures.ts`'s `Venture` interface gets an optional
`downloads?: { project: string }`. The Download button only renders when
this is present. It's set on exactly one entry — `powerclaude` — today.
Adding it to any other venture is a one-line, explicit, reviewable edit;
nothing about the component tree or the route handler auto-applies to a
venture just because it exists. This is the actual mechanism that
honors "ask before adding any others."

**UI: reuse the résumé modal's interaction model, not its look.**
`resume-modal.tsx` already has the hard part solved — a global
`open-download` event any trigger can dispatch, focus trap, Tab-cycling,
Escape-to-close, scroll lock, focus restoration on close. The *visual*
register is different on purpose: the résumé modal is intentionally a
light, paper-like surface (it's meant to read as a document to a
recruiter). The download picker should look like the rest of the site —
`rounded-2xl border border-border bg-card`, monospace uppercase
tracking-widest labels, `accent-blue` hover/focus states, same family as
the venture cards and command palette. The dormant
`animate-modal-backdrop-in` / `animate-modal-panel-in` keyframes already
in `globals.css` (defined, currently unused) are the entrance animation.

Three OS buttons (Mac / Linux / Windows), explicit pick — no User-Agent
sniffing, matching Oliver's own stated reasoning (privacy browsers spoof
UA; an explicit pick is more honest anyway). Below the buttons, a single
small line: *"By downloading, you agree to the MIT License and our
Terms."* — both inline links, not a blocking checkbox. This satisfies
the "by downloading you're agreeing to..." ask without adding friction
a personal portfolio site's download flow doesn't need.

**Legal: a short new `/terms` page, plus one new section on
`/privacy`.** Terms is scoped to what's actually true and actually
needed — the software ships under PowerClaude's own MIT license (already
true, already in the repo), provided as-is with no warranty, usage
subject to that license. Written in the same direct, no-boilerplate
voice as the existing privacy page, not a generic legal-template wall.
Privacy gets one new `Section` ("If you download a project") stating
exactly what `download_events` captures — matching that page's existing
per-section, exact-schema format.

**Placement: detail page only.** The Download button lives in
`/work/[slug]/page.tsx`'s facts sidebar, next to the existing repo link
— rendered only when `venture.downloads` is set. The homepage grid card
stays as it is.

## Architecture

```
/work/powerclaude page
  └─ Download button (sidebar) → dispatches open-download event
       └─ DownloadModal (mounted once in layout.tsx, like ResumeModal)
            ├─ Mac   → <a href="/api/download/powerclaude?platform=mac">
            ├─ Linux → <a href="/api/download/powerclaude?platform=linux">
            └─ Windows → <a href="/api/download/powerclaude?platform=windows">

/api/download/[project]/route.ts
  1. zod-validate project + platform
  2. fetch current download_releases row (project, platform, is_current=true)
  3. fire-and-forget: POST download_events (ip_hash, platform, version, user_agent)
  4. 302 redirect → release row's blob_url
  (unknown project/platform → 400; no current release row → 404 with a
   plain "not published yet" response, not a crash)

scripts/release-powerclaude.{sh,mjs} (manual, run on purpose)
  1. snapshot ~/Projects/powerclaude's tracked tree, minus .git/.gitnexus/.claude/dev-only files
  2. package as -mac.tar.gz / -linux.tar.gz / -windows.zip
  3. compute sha256, upload all three to Vercel Blob
  4. upsert download_releases rows, flip is_current for this project+platform

/admin/downloads page
  └─ same Supabase-REST-with-service-role-key pattern as /admin/security:
     total count, per-platform breakdown, recent events, current versions
```

### Data model (Supabase, `oliverstraus-com` project — same DB as
`contact_submissions`/`honeypot_hits`, both RLS-enabled with zero
policies, service-role-key-only access)

```sql
download_releases (
  id uuid pk,
  project text,        -- "powerclaude" today; generalizable later
  platform text,        -- 'mac' | 'linux' | 'windows'
  version text,
  blob_url text,
  sha256 text,
  size_bytes bigint,
  is_current boolean,
  created_at timestamptz
)

download_events (
  id uuid pk,
  project text,
  platform text,
  version text,
  ip_hash text,
  user_agent text,
  created_at timestamptz
)
```

### Error handling

- Unknown `project` or `platform` on the route → 400, plain text, no
  stack trace.
- No current release row for a valid project+platform (e.g. only 2 of 3
  platforms published yet) → 404 with a short plain-text message; never
  silently redirect to a stale/broken URL.
- Blob upload or Supabase write failing during a release cut → the
  release script aborts before flipping `is_current`, so a half-finished
  release never goes live partially.
- Logging a `download_events` row failing must never block the redirect
  — same "logging must never break the response" rule the honeypot
  logger already follows, just not awaited first (no ordering constraint
  here the way flood-detection needs one).

### Testing

- Vitest: route handler's platform/project validation, redirect-target
  resolution against a mocked Supabase response, 400/404 paths.
- Vitest: new `admin-stats.ts` helpers (per-platform counts) alongside
  the existing `countBy` tests.
- Manual click-through in the browser preview for the modal (focus trap,
  Escape, all three platform links resolve), matching this repo's usual
  verification style — no new E2E framework introduced.

## Out of scope (explicitly, per Oliver's own framing)

- Any venture other than PowerClaude getting a download button.
- Raw-IP collection for downloads (kept at the same hash-only posture as
  the rest of the site unless Oliver separately decides to revisit
  `/privacy`'s own stated practice).
- Auto-publishing a release on every git push — cutting a release stays
  a deliberate, manual action.
- GitHub Releases, GitHub Actions, or any GitHub-hosted distribution —
  off the table per Oliver's own account situation.
