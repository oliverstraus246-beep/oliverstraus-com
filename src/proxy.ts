import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, hashIp, isIpBlocked } from "@/lib/security";

// Fake sensitive-looking paths. A hit means a scanner or bot, not a real
// visitor -- nothing real is ever mounted at any of these. "/admin" used to
// be one of these (a decoy indistinguishable from the others), but a real
// dashboard now lives there -- it goes through checkAdminAuth below instead.
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

// Byte-by-byte XOR accumulation instead of `===` -- a naive string compare
// short-circuits on the first mismatched character, so its timing leaks how
// many leading characters of a guess were correct. This always walks the
// full length of the longer input and folds the length difference in too,
// so a wrong-length guess doesn't return measurably faster than a
// right-length wrong guess.
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < Math.max(aBytes.length, bBytes.length); i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

const LOCKOUT_MAX_FAILURES = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

function supabaseReadHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

// Only requests that actually presented an Authorization header count as an
// "attempt" for lockout purposes -- a browser's very first hit on an
// unauthenticated tab has no header at all (that's what triggers the native
// prompt), and penalizing that would lock Oliver out of his own dashboard
// just for opening it in a fresh browser/session.
async function recentFailedAttempts(ipHash: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;

  const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60_000).toISOString();
  try {
    const res = await fetch(
      `${url}/rest/v1/admin_auth_attempts?select=id&ip_hash=eq.${ipHash}&success=eq.false&created_at=gte.${since}`,
      { headers: supabaseReadHeaders(key) },
    );
    if (!res.ok) return 0;
    return ((await res.json()) as unknown[]).length;
  } catch {
    return 0;
  }
}

async function logAdminAuthAttempt(ipHash: string, success: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/rest/v1/admin_auth_attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...supabaseReadHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({ ip_hash: ipHash, success }),
    });
  } catch {
    // Logging must never break the auth decision itself.
  }
}

// The stats dashboard (src/app/admin/*) has no user-facing login form --
// HTTP Basic Auth via this one check is the whole access control. Simplest
// thing that actually gates a single-owner admin section: no session table,
// no cookie, the browser's own credential prompt handles it.
async function checkAdminAuth(
  request: NextRequest,
): Promise<"authorized" | "unauthorized" | "locked" | "blocked"> {
  const user = process.env.ADMIN_STATS_USER;
  const pass = process.env.ADMIN_STATS_PASSWORD;
  if (!user || !pass) return "unauthorized"; // not configured -- fail closed, not open

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return "unauthorized"; // no attempt made yet -- don't log, don't rate-limit

  const ipHash = await hashIp(getClientIp(request));
  if (await isIpBlocked(ipHash)) return "blocked";
  if ((await recentFailedAttempts(ipHash)) >= LOCKOUT_MAX_FAILURES) return "locked";

  const decoded = atob(header.slice("Basic ".length));
  const separatorIndex = decoded.indexOf(":");
  const providedUser = separatorIndex === -1 ? decoded : decoded.slice(0, separatorIndex);
  const providedPass = separatorIndex === -1 ? "" : decoded.slice(separatorIndex + 1);

  const ok = timingSafeEqual(providedUser, user) && timingSafeEqual(providedPass, pass);
  void logAdminAuthAttempt(ipHash, ok);
  return ok ? "authorized" : "unauthorized";
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"' },
  });
}

function locked() {
  return new NextResponse("Too many failed attempts. Try again later.", { status: 429 });
}

function blocked() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Covers the real /admin landing page itself plus every real subpath
  // (/admin/stats, /admin/contacts, ...).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const status = await checkAdminAuth(request);
    if (status === "blocked") return blocked();
    if (status === "locked") return locked();
    if (status === "unauthorized") return unauthorized();
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
