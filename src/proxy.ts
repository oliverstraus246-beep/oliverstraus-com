import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, hashIp, isIpBlocked } from "@/lib/security";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Fake sensitive-looking paths. A hit means a scanner or bot, not a real
// visitor -- nothing real is ever mounted at any of these. "/admin" used to
// be one of these (a decoy indistinguishable from the others), but a real
// dashboard now lives there -- it goes through proxyAdmin below instead.
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

// Static, nonce-free CSP. A per-request nonce (the stricter pattern from the
// Next.js CSP guide) is incompatible with this site's static prerendering:
// Next.js injects nonces during server-side rendering from the request CSP
// header, but statically prerendered pages are built once at build time with
// no request headers, so no nonce is ever attached to the <script> tags. With
// script-src 'nonce-…' 'strict-dynamic', that blocked every chunk, the RSC
// payload, the theme-init, and the boot failsafe — the site rendered as a
// non-interactive shell (no hydration, no nav/modal/animations/theme switch),
// the exact "boot overlay stuck" signature. 'unsafe-inline' is the docs'
// recommended fallback for non-sensitive static sites and keeps prerendering.
// All other directives (object-src 'none', frame-ancestors 'none', base-uri,
// form-action, UIR) stay — those carry the real protection here.
function buildCspHeader() {
  const isDev = process.env.NODE_ENV === "development";
  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
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

function blocked() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

// Gate is a signed session cookie, not HTTP Basic Auth -- see
// src/app/admin/login for why (Basic Auth's browser-side credential cache
// resends the same value on every request, which doesn't work once a TOTP
// code is part of that value: the code goes stale in 30-90s and every
// navigation after that failed and re-prompted). The credential + lockout
// check itself now lives in the login Server Action (src/app/admin/actions.ts),
// which only runs once per login instead of once per page view; this
// middleware just checks whether a valid session already exists.
async function proxyAdmin(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!(pathname === "/admin" || pathname.startsWith("/admin/"))) return null;
  if (pathname === "/admin/login") return null; // must stay reachable while logged out

  const ipHash = await hashIp(getClientIp(request));
  if (await isIpBlocked(ipHash)) return blocked();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return null; // valid session -- let it through

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminResponse = await proxyAdmin(request);
  if (adminResponse) return adminResponse;

  if (HONEYPOT_PATHS.has(pathname)) {
    // Fire-and-forget: a slow or failed log write must never delay or break
    // the response to whatever is probing this path.
    void logHoneypotHit(request, pathname);
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const contentSecurityPolicy = buildCspHeader();

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  // Authenticated admin pages must never be cached (browser bfcache, shared
  // machine, CDN, etc.) -- a page containing visitor IPs and contact
  // messages sticking around in a disk cache after the tab closes is exactly
  // the kind of thing worth ruling out explicitly rather than trusting
  // defaults.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }
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
