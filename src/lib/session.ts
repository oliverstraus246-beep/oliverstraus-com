// Signed session cookie for /admin/*, replacing HTTP Basic Auth. Basic Auth
// credentials get cached by the browser and resent unchanged on every later
// request -- fine for a static password, but the TOTP code embedded in that
// cached credential goes stale after ~30-90s, so every navigation past the
// first minute failed and re-prompted forever. A real login (see
// src/app/admin/login) verifies the password + code ONCE and issues this
// cookie instead; the code never needs to be resent.
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_COOKIE = "admin_session";

// The signing key is derived from secrets that already exist -- no new env
// var needed, and rotating ADMIN_STATS_PASSWORD or ADMIN_TOTP_SECRET
// automatically invalidates every existing session, which is the behavior
// you want when a credential changes.
async function getSigningKey(): Promise<CryptoKey> {
  const material = [
    process.env.ADMIN_STATS_PASSWORD ?? "",
    process.env.ADMIN_TOTP_SECRET ?? "",
    process.env.CONTACT_IP_HASH_SALT ?? "",
  ].join(":");
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function hmacHex(key: CryptoKey, message: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const key = await getSigningKey();
  const sig = await hmacHex(key, String(expiresAt));
  return `${expiresAt}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [expiresAtStr, sig] = token.split(".");
  if (!expiresAtStr || !sig) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const key = await getSigningKey();
  const expected = await hmacHex(key, expiresAtStr);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
