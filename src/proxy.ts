import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, hashIp, isIpBlocked } from "@/lib/security";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { isTrustedIp } from "@/lib/admin-auth";

// Shown at random on a honeypot hit instead of a plain 404 -- purely for the
// rare human who actually looks at the response body. Automated scanners
// just check status code / look for expected file contents (an .env parser
// wants "KEY=value" lines, a WordPress scanner wants specific markers) and
// find neither here, so this changes nothing about how they behave. Status
// stays 404 -- a 200 could make bot networks flag the IP as "has a live
// target," inviting more traffic, which defeats the point.
const HONEYPOT_TAUNTS = [
  "You thought.",
  "lol nice try.",
  "Nothing here but you, and now I know your name.",
  "This isn't the exploit you're looking for.",
  "404, but make it personal.",
  "Scan harder.",
  "Found something? No. Found you? Yes.",
];

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

async function logHoneypotHit(request: NextRequest, path: string, clientIp: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return; // not configured yet -- never let this crash the response

  const ip_hash = await hashIp(clientIp);
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    await fetch(`${url}/rest/v1/honeypot_hits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        path,
        ip_hash,
        ip_address: clientIp === "unknown" ? null : clientIp,
        user_agent: request.headers.get("user-agent") ?? null,
      }),
    });
  } catch {
    // logging must never break the (fake) response
  }

  // Nothing real is ever mounted at a honeypot path, so hitting one is a
  // 100% reliable "this is a bot" signal -- auto-block on the spot, unless
  // this hash has ever successfully logged into admin (that's Oliver
  // testing, not a scanner). Combined with the session-first ordering in
  // proxyAdmin and the credential-first ordering in loginAdmin, this can
  // flag a false positive without ever actually locking him out.
  try {
    if (!(await isTrustedIp(ip_hash))) {
      await fetch(`${url}/rest/v1/blocked_ips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ ip_hash, reason: `Auto-blocked: honeypot hit at ${path}` }),
      });
    }
  } catch {
    // Auto-block failing must never break the (fake) response either.
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

// "Do you want to see a magic trick?" -- a native <details>/<summary>
// disclosure, no JavaScript at all, so it works regardless of CSP and can't
// be mistaken for anything script-driven. The "trick" is just handing the
// requester their own IP back -- not sensitive (it's the one piece of data
// they already necessarily know about themselves), same category as any
// "what's my IP" site. Nothing about any OTHER visitor is ever in this
// response.
function honeypotHtml(taunt: string, clientIp: string): string {
  const shownIp = clientIp === "unknown" ? "suspiciously well-hidden. Nice." : clientIp;
  const escapedIp = shownIp.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>404</title></head>
<body style="background:#0a0a0a;color:#e5e5e5;font-family:ui-monospace,Menlo,Consolas,monospace;padding:3rem 1.5rem;max-width:34rem;margin:0 auto;line-height:1.5;">
<p style="font-size:1.05rem;">${taunt}</p>
<details style="margin-top:1.5rem;">
<summary style="cursor:pointer;color:#7dd3fc;">Want to see a magic trick? Click here.</summary>
<p style="margin-top:0.75rem;color:#a3a3a3;">Your IP is ${escapedIp}. Ta-da.</p>
</details>
</body></html>`;
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

  // Session check comes BEFORE the blocklist check, not after. Honeypot
  // hits now auto-block their source (see logHoneypotHit) -- if Oliver ever
  // trips one himself (new IP he's poking at for testing) while already
  // holding a valid session, this ordering is what stops that from locking
  // him out of his own dashboard. A valid session cookie is proof of
  // identity strong enough to override a coarse IP-level block.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return null;

  const ipHash = await hashIp(getClientIp(request));
  if (await isIpBlocked(ipHash)) return blocked();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminResponse = await proxyAdmin(request);
  if (adminResponse) return adminResponse;

  const contentSecurityPolicy = buildCspHeader();

  if (HONEYPOT_PATHS.has(pathname)) {
    const clientIp = getClientIp(request);
    // Fire-and-forget: a slow or failed log write must never delay or break
    // the response to whatever is probing this path.
    void logHoneypotHit(request, pathname, clientIp);
    const taunt = HONEYPOT_TAUNTS[Math.floor(Math.random() * HONEYPOT_TAUNTS.length)]!;
    return new NextResponse(honeypotHtml(taunt, clientIp), {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": contentSecurityPolicy,
      },
    });
  }

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
