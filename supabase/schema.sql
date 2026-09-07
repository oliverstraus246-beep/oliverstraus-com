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
  user_agent text
);

alter table honeypot_hits enable row level security;

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
  success boolean not null
);

alter table admin_auth_attempts enable row level security;

create index if not exists admin_auth_attempts_ip_hash_created_at_idx
  on admin_auth_attempts (ip_hash, created_at);

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
