"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getClientIpFromHeaders, hashIp } from "@/lib/security";
import { LOCKOUT_MAX_FAILURES, logAdminAuthAttempt, recentFailedAttempts, timingSafeEqual } from "@/lib/admin-auth";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { verifyTotp } from "@/lib/totp";

// Server Actions for the /admin/* write operations (block/unblock a
// visitor, purge old rows, login/logout). Everything except loginAdmin
// itself POSTs to a page already behind the session-cookie gate in
// proxy.ts, so no separate auth surface to maintain for those.
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

function loginRedirect(next: string, error: string): never {
  const params = new URLSearchParams({ error });
  if (next) params.set("next", next);
  redirect(`/admin/login?${params.toString()}`);
}

// The one action proxy.ts doesn't gate (it can't -- this IS the gate).
// Verifies username + password + TOTP code, checks the blocklist and the
// same 5-failures/15-minute lockout the old Basic Auth flow used, and on
// success issues the signed session cookie from lib/session.ts.
export async function loginAdmin(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const next = String(formData.get("next") ?? "/admin");
  const safeNext = next.startsWith("/admin") ? next : "/admin";

  const expectedUser = process.env.ADMIN_STATS_USER;
  const expectedPass = process.env.ADMIN_STATS_PASSWORD;
  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  if (!expectedUser || !expectedPass) {
    loginRedirect(safeNext, "Admin login isn't configured on this environment.");
  }

  const ip = getClientIpFromHeaders(await headers());
  const ipHash = await hashIp(ip);

  // No isIpBlocked gate here, deliberately: correct password + TOTP code is
  // already the real security boundary, and a source can only end up
  // auto-blocked (see proxy.ts's logHoneypotHit) by hitting a fake trap path
  // no real login flow ever touches. Rejecting a *correct* login here would
  // mean a false-positive auto-block could permanently lock Oliver out --
  // the failed-attempt lockout below still throttles anyone who doesn't
  // actually know the credentials, blocked or not.
  if ((await recentFailedAttempts(ipHash)) >= LOCKOUT_MAX_FAILURES) {
    loginRedirect(safeNext, "Too many failed attempts. Try again in a few minutes.");
  }

  const otpOk = totpSecret ? await verifyTotp(totpSecret, code) : true;
  const ok = timingSafeEqual(username, expectedUser) && timingSafeEqual(password, expectedPass) && otpOk;
  void logAdminAuthAttempt(ipHash, ip, ok);

  if (!ok) {
    loginRedirect(safeNext, "Incorrect username, password, or code.");
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  redirect(safeNext);
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: "/admin" });
  redirect("/admin/login");
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
  revalidatePath(`/admin/stats/visitor/${ipHash}`);
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
  revalidatePath(`/admin/stats/visitor/${ipHash}`);
}

export async function setVisitorNote(formData: FormData) {
  const ipHash = String(formData.get("ipHash") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!ipHash) return;

  const { url, key } = supabaseConfig();
  if (note) {
    await fetch(`${url}/rest/v1/visitor_notes`, {
      method: "POST",
      headers: { ...supabaseHeaders(key), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ ip_hash: ipHash, note, updated_at: new Date().toISOString() }),
    });
  } else {
    // Empty note submitted -- treat it as "clear the note" rather than
    // storing an empty string.
    await fetch(`${url}/rest/v1/visitor_notes?ip_hash=eq.${ipHash}`, {
      method: "DELETE",
      headers: supabaseHeaders(key),
    });
  }

  revalidatePath(`/admin/stats/visitor/${ipHash}`);
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
