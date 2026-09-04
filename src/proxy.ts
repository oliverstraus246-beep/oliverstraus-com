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

// The stats dashboard (src/app/admin/stats) has no user-facing login form --
// HTTP Basic Auth via this one check is the whole access control. Simplest
// thing that actually gates a single-owner admin page: no session table,
// no cookie, the browser's own credential prompt handles it. Constant-time
// isn't needed here (the values compared are per-request strings against
// env-configured secrets, not a hash search over a real credential store).
function isAuthorizedAdmin(request: NextRequest): boolean {
  const user = process.env.ADMIN_STATS_USER;
  const pass = process.env.ADMIN_STATS_PASSWORD;
  if (!user || !pass) return false; // not configured -- fail closed, not open

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  const decoded = atob(header.slice("Basic ".length));
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  return (
    decoded.slice(0, separatorIndex) === user &&
    decoded.slice(separatorIndex + 1) === pass
  );
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"' },
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !isAuthorizedAdmin(request)) {
    return unauthorized();
  }

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
