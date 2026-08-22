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
