"use server";

import { revalidatePath } from "next/cache";

// Server Actions for the /admin/* write operations (block/unblock a
// visitor, purge old rows). These POST to whatever /admin/* page invoked
// them, so proxy.ts's existing Basic Auth gate covers them the same way it
// covers the page load itself -- no separate auth surface to maintain.
function supabaseHeaders(key: string) {
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: "return=minimal",
  };
}

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars aren't configured.");
  return { url, key };
}

export async function blockIp(formData: FormData) {
  const ipHash = String(formData.get("ipHash") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!ipHash) return;

  const { url, key } = supabaseConfig();
  // Upsert (Prefer: resolution=merge-duplicates) -- blocking an
  // already-blocked hash just updates the reason instead of erroring on
  // the primary-key conflict.
  await fetch(`${url}/rest/v1/blocked_ips`, {
    method: "POST",
    headers: { ...supabaseHeaders(key), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ ip_hash: ipHash, reason: reason || null }),
  });

  revalidatePath("/admin/security");
  revalidatePath("/admin/stats");
}

export async function unblockIp(formData: FormData) {
  const ipHash = String(formData.get("ipHash") ?? "").trim();
  if (!ipHash) return;

  const { url, key } = supabaseConfig();
  await fetch(`${url}/rest/v1/blocked_ips?ip_hash=eq.${ipHash}`, {
    method: "DELETE",
    headers: supabaseHeaders(key),
  });

  revalidatePath("/admin/security");
  revalidatePath("/admin/stats");
}

const RETENTION_DAYS = 90;

export async function purgeOldHoneypotHits() {
  const { url, key } = supabaseConfig();
  const before = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${url}/rest/v1/honeypot_hits?created_at=lt.${before}`, {
    method: "DELETE",
    headers: supabaseHeaders(key),
  });
  revalidatePath("/admin/security");
}
