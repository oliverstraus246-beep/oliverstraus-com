// RFC 6238 TOTP (the standard behind Google Authenticator / Authy / 1Password
// "time-based one-time codes"), implemented directly on Web Crypto so it
// works in both the Node and Edge runtimes with no new dependency -- the
// same reasoning as hashIp in lib/security.ts using crypto.subtle.digest.
const STEP_SECONDS = 30;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = "";
  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) continue; // skip any stray non-alphabet character
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

async function totpAt(secretBase32: string, timeStep: number): Promise<string> {
  const keyBytes = base32Decode(secretBase32);
  // 8-byte big-endian counter -- timeStep (seconds-since-epoch / 30) won't
  // exceed 32 bits until the year ~4147, so only the low word is written.
  const counter = new ArrayBuffer(8);
  new DataView(counter).setUint32(4, timeStep, false);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter));

  // RFC 4226 dynamic truncation.
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binCode =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return (binCode % 1_000_000).toString().padStart(6, "0");
}

// Accepts the current 30s window plus one step either side (90s of total
// tolerance) so a slightly-off phone clock or a code entered right at a
// window boundary still works.
export async function verifyTotp(secretBase32: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const currentStep = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (const offset of [0, -1, 1]) {
    if ((await totpAt(secretBase32, currentStep + offset)) === code) return true;
  }
  return false;
}
