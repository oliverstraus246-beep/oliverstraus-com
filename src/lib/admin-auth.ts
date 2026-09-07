// Shared between proxy.ts (session/blocklist checks on every /admin/*
// request) and the login Server Action (the actual credential + lockout
// check, which only runs once per login instead of once per request).
export const LOCKOUT_MAX_FAILURES = 5;
export const LOCKOUT_WINDOW_MINUTES = 15;

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

// Byte-by-byte XOR accumulation instead of `===` -- a naive string compare
// short-circuits on the first mismatched character, so its timing leaks how
// many leading characters of a guess were correct. This always walks the
// full length of the longer input and folds the length difference in too,
// so a wrong-length guess doesn't return measurably faster than a
// right-length wrong guess.
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < Math.max(aBytes.length, bBytes.length); i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

// Only counts attempts that actually reached the login form and submitted
// credentials -- there's no equivalent of Basic Auth's "no header yet"
// no-op case anymore, every submission is a real attempt.
export async function recentFailedAttempts(ipHash: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;

  const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60_000).toISOString();
  try {
    const res = await fetch(
      `${url}/rest/v1/admin_auth_attempts?select=id&ip_hash=eq.${ipHash}&success=eq.false&created_at=gte.${since}`,
      { headers: supabaseHeaders(key) },
    );
    if (!res.ok) return 0;
    return ((await res.json()) as unknown[]).length;
  } catch {
    return 0;
  }
}

// Whether this hash has ever successfully logged into admin -- the only
// thing that proves "this is Oliver" (correct password + TOTP code), since
// his IP changes across networks and VPNs. Used to exempt him from the
// honeypot auto-block in proxy.ts: without this, testing the honeypot
// paths from a fresh IP/VPN would auto-block himself. He still needs to
// log in from a given IP at least once before poking honeypot paths from
// it -- and even without that, the ordering fixes in proxyAdmin/loginAdmin
// mean a false-positive auto-block can never actually strand him.
export async function isTrustedIp(ipHash: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const res = await fetch(
      `${url}/rest/v1/admin_auth_attempts?select=id&ip_hash=eq.${ipHash}&success=eq.true&limit=1`,
      { headers: supabaseHeaders(key) },
    );
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

export async function logAdminAuthAttempt(ipHash: string, ipAddress: string, success: boolean): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/rest/v1/admin_auth_attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...supabaseHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({
        ip_hash: ipHash,
        ip_address: ipAddress === "unknown" ? null : ipAddress,
        success,
      }),
    });
  } catch {
    // Logging must never break the auth decision itself.
  }
}
