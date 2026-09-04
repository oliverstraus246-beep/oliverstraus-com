const encoder = new TextEncoder();

/**
 * One-way hash of a client IP, salted server-side. Lets us rate-limit and
 * correlate abuse without ever persisting a raw IP address.
 */
export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.CONTACT_IP_HASH_SALT ?? "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${salt}:${ip}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Manual blocklist, managed from /admin/security. Checked by the contact
 * form and tracking pixel before they write anything -- a blocked ip_hash's
 * request is silently no-op'd (same fake-success shape as a legitimate
 * request gets) rather than told it was blocked, so a blocked actor learns
 * nothing new. Deliberately NOT enforced on ordinary page GETs: that would
 * add a Supabase round trip to every single visitor's page load on an
 * otherwise-static site. A real network-level block (stop the request
 * before it costs anything at all) belongs in Vercel's own Firewall, not
 * reimplemented at the application layer here.
 */
export async function isIpBlocked(ipHash: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const res = await fetch(`${url}/rest/v1/blocked_ips?select=ip_hash&ip_hash=eq.${ipHash}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return false; // A blocklist check failing must never take the whole site down.
  }
}
