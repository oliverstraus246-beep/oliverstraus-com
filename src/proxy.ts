import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, hashIp } from "@/lib/security";

// Fake sensitive-looking paths. A hit means a scanner or bot, not a real
// visitor -- nothing real is ever mounted at any of these.
const HONEYPOT_PATHS = new Set([
  "/wp-admin",
  "/wp-login.php",
  "/wp-content/debug.log",
  "/xmlrpc.php",
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.git/config",
  "/.git/HEAD",
  "/admin",
  "/administrator",
  "/administrator/index.php",
  "/phpmyadmin",
  "/config.php",
  "/wp-config.php.bak",
  "/.aws/credentials",
  "/actuator/env",
  "/server-status",
]);

async function logHoneypotHit(request: NextRequest, path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return; // not configured yet -- never let this crash the response

  const ip_hash = await hashIp(getClientIp(request));

  try {
    await fetch(`${url}/rest/v1/honeypot_hits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        path,
        ip_hash,
        user_agent: request.headers.get("user-agent") ?? null,
      }),
    });
  } catch {
    // logging must never break the (fake) response
  }
}

function buildCspHeader(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (HONEYPOT_PATHS.has(pathname)) {
    // Fire-and-forget: a slow or failed log write must never delay or break
    // the response to whatever is probing this path.
    void logHoneypotHit(request, pathname);
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
