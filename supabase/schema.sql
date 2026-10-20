-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Matches exactly what src/app/api/contact/route.ts and src/proxy.ts write.
--
-- RLS is enabled with zero policies on both tables: the anon/publishable
-- key (safe to expose client-side) cannot read or write either table.
-- Only the service_role key (server-side only, bypasses RLS) can, which
-- is exactly what the contact API route and proxy.ts honeypot logger use.

create table if not exists contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  name text not null,
  reason text not null,
  ip_hash text not null,
  user_agent text
);

alter table contact_submissions enable row level security;

create index if not exists contact_submissions_ip_hash_created_at_idx
  on contact_submissions (ip_hash, created_at);

create table if not exists honeypot_hits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null,
  ip_hash text not null,
  ip_address text,
  user_agent text,
  attack_type text
);

alter table honeypot_hits enable row level security;

-- Migration for the already-live table: ip_address didn't exist at first --
-- a scanner that only ever probed honeypot paths (never loaded any JS, so
-- never generated a page_views row either) had no raw IP stored anywhere,
-- which meant its /admin/stats/visitor/[ipHash] profile was permanently
-- stuck at "IP unknown" even though proxy.ts had the real IP in hand the
-- whole time.
alter table honeypot_hits add column if not exists ip_address text;

-- attack_type is null for a plain honeypot-path hit with no recognizable
-- payload attached (most bot traffic -- a bare GET to /wp-admin). It's set
-- to one of src/proxy.ts's ATTACK_SIGNATURES type strings (sqli, xss,
-- path_traversal, etc.) when the pathname or query string on ANY public
-- request matched a recognized attack pattern -- this table now covers
-- both "hit a decoy path" and "sent a real attack payload anywhere,"
-- distinguished by this column.
alter table honeypot_hits add column if not exists attack_type text;

-- Visitor tracking pixel, written by src/app/api/track/route.ts. Same
-- service_role-only RLS posture as the tables above: the anon/publishable
-- key can't read or write this table, only the server-side route can.
--
-- view_id is a client-generated UUID shared by exactly two writes per page
-- view: the initial insert (on load) and one later update to duration_ms
-- (on tab-hide/pagehide, once the visitor's actual time-on-page is known).
-- It's how the second write finds the first row again -- there's no visitor
-- session/auth to key off instead.
-- ip_address (added after ip_hash existed -- see migration block below) is
-- the raw client IP, deliberately kept alongside the hash now that
-- /admin/stats/visitor/[ipHash] wants to show it. This is a real posture
-- change: every other table here stores only a salted one-way hash so nothing
-- resembling a real IP sits in the database. Vercel's own request logs
-- already carry the raw IP regardless of what this app stores, but adding it
-- here means a Supabase breach now exposes real visitor IPs directly instead
-- of an unrecoverable hash. Accepted deliberately, not accidentally.
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null,
  referrer text,
  ip_hash text not null,
  ip_address text,
  user_agent text,
  country text,
  region text,
  city text,
  view_id uuid,
  viewport_width integer,
  viewport_height integer,
  language text,
  duration_ms integer
);

alter table page_views enable row level security;

create index if not exists page_views_created_at_idx
  on page_views (created_at);

create index if not exists page_views_path_created_at_idx
  on page_views (path, created_at);

create index if not exists page_views_view_id_idx
  on page_views (view_id);

-- Migration for the already-live table (created before the columns above
-- existed) -- safe to run again on a fresh table too, every clause is
-- idempotent.
alter table page_views add column if not exists view_id uuid;
alter table page_views add column if not exists viewport_width integer;
alter table page_views add column if not exists viewport_height integer;
alter table page_views add column if not exists language text;
alter table page_views add column if not exists duration_ms integer;
alter table page_views add column if not exists ip_address text;
create index if not exists page_views_view_id_idx on page_views (view_id);
create index if not exists page_views_ip_hash_created_at_idx on page_views (ip_hash, created_at);

-- Failed/succeeded Basic Auth attempts against /admin/*, written by
-- proxy.ts's checkAdminAuth. Powers both the lockout (5 failures in 15
-- minutes from one ip_hash -> 429s until the window ages out) and the
-- "who's poking at my admin panel" view on /admin/security.
create table if not exists admin_auth_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ip_hash text not null,
  ip_address text,
  success boolean not null
);

alter table admin_auth_attempts enable row level security;

create index if not exists admin_auth_attempts_ip_hash_created_at_idx
  on admin_auth_attempts (ip_hash, created_at);

-- Same reasoning as honeypot_hits.ip_address above: someone who only ever
-- tried (and failed or succeeded at) /admin/login, without ever loading a
-- normal page first, had no raw IP recorded anywhere.
alter table admin_auth_attempts add column if not exists ip_address text;

-- Manual blocklist, managed from /admin/security (block/unblock buttons on
-- scanner IPs, visitors, and honeypot hits). Checked by the contact form
-- and tracking pixel (src/lib/security.ts's isIpBlocked) before they write
-- anything. Primary key is the ip_hash itself -- one row per blocked
-- source, "block" is idempotent (upsert), "unblock" is a delete by key.
create table if not exists blocked_ips (
  ip_hash text primary key,
  reason text,
  created_at timestamptz not null default now()
);

alter table blocked_ips enable row level security;

-- Free-text label Oliver can attach to a visitor from their profile page
-- (/admin/stats/visitor/[ipHash]) -- "this is my friend Jake", "recruiter
-- from X", whatever. Purely for his own organization; nothing here is
-- ever shown to the visitor or affects their access (that's blocked_ips).
create table if not exists visitor_notes (
  ip_hash text primary key,
  note text not null,
  updated_at timestamptz not null default now()
);

alter table visitor_notes enable row level security;

-- Cache for src/lib/ip-intel.ts's lookups against ip-api.com (free, no API
-- key, 45 req/min from one server IP) -- ISP/org/ASN, whether the IP is a
-- known VPN/proxy, hosting/datacenter, or mobile carrier, and reverse DNS.
-- Keyed by raw IP (not ip_hash) since the lookup is inherently about the
-- real address; entries are reused for 30 days (src/lib/ip-intel.ts's
-- CACHE_TTL_MS) before a fresh lookup replaces them. Oliver explicitly
-- opted into this: it's the one place on this site that sends visitor data
-- (a raw IP) to a third party outside Supabase/Vercel.
create table if not exists ip_intel (
  ip_address text primary key,
  country text,
  region text,
  city text,
  isp text,
  org text,
  asn text,
  is_proxy boolean not null default false,
  is_hosting boolean not null default false,
  is_mobile boolean not null default false,
  reverse_dns text,
  fetched_at timestamptz not null default now()
);

alter table ip_intel enable row level security;

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

-- Persistent first-party visitor identifier, written by src/lib/visitor-id.ts
-- (a UUID generated once and kept in the browser's localStorage, not a
-- cookie) and sent along with every page_views beacon. ip_hash alone
-- fragments one real person into several "visitors" the moment their IP
-- changes (home IP rotation, wifi<->cellular, a VPN toggling) -- this is the
-- secondary correlation key /admin/stats/visitor/[ipHash] uses to follow the
-- same browser across that kind of change instead of splitting the history.
-- Nullable: older rows, and visitors with storage blocked/cleared/private-mode,
-- simply can't be cross-IP-correlated -- not a broken profile, just no merge.
alter table page_views add column if not exists visitor_id uuid;
create index if not exists page_views_visitor_id_idx on page_views (visitor_id);

-- Browser-reported IANA timezone (Intl.DateTimeFormat().resolvedOptions().timeZone),
-- e.g. "America/Denver". Free cross-check against the IP-derived country/region
-- from Vercel's edge network: a US IP paired with a non-US timezone is exactly
-- the shape a VPN/proxy produces. Shown next to the existing ip-api.com VPN/
-- hosting flags on the visitor profile, not auto-flagged -- too many legitimate
-- reasons (travel, a misconfigured OS clock, a multi-region timezone) for a
-- mismatch to be safely automated into a badge.
alter table page_views add column if not exists timezone text;

-- UTM campaign params read off the landing page's own URL (?utm_source=...),
-- the standard way to tag a shared link for "which channel sent this visitor"
-- -- general-purpose, unlike the résumé-only /r/resume redirect below, since
-- it works for a link to any page, not just the résumé.
alter table page_views add column if not exists utm_source text;
alter table page_views add column if not exists utm_medium text;
alter table page_views add column if not exists utm_campaign text;
create index if not exists page_views_utm_source_idx on page_views (utm_source);

-- How far down the page (0-100) the visitor actually scrolled before leaving
-- -- sent alongside duration_ms on the same "duration" beacon, matched by the
-- same view_id. A much stronger engagement signal than time-on-page alone: a
-- tab left open for ten minutes without scrolling past the fold isn't
-- engagement, and a 15-second visit that scrolled to the bottom might be.
alter table page_views add column if not exists max_scroll_pct integer;

-- Click log for /r/resume (src/app/r/resume/route.ts), the tracked redirect
-- Oliver shares off-site (email signature, job applications, LinkedIn) so he
-- can see which channel actually drives résumé opens -- on-site opens (the
-- modal, the standalone /resume route) are already covered by page_views and
-- don't go through this. Chosen over a dedicated subdomain: same analytics
-- value (which outbound link got clicked), no second deployment/DNS/cert to
-- maintain for one document. `src` is whatever tag the shared link carries
-- (e.g. "linkedin", "email-signature") and is caller-supplied, not validated
-- against a fixed list, since Oliver is the only one who ever creates these
-- links. ip_hash only -- same posture as download_events.
create table if not exists resume_redirect_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  src text,
  ip_hash text not null,
  user_agent text
);

alter table resume_redirect_clicks enable row level security;

create index if not exists resume_redirect_clicks_created_at_idx
  on resume_redirect_clicks (created_at);

create index if not exists resume_redirect_clicks_src_idx
  on resume_redirect_clicks (src);
