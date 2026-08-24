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
