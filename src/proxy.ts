import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, hashIp, isIpBlocked } from "@/lib/security";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { isTrustedIp } from "@/lib/admin-auth";
import { attackTypeLabel } from "@/lib/admin-stats";

// Shown at random on a plain honeypot-path hit with no recognizable payload
// attached (a bot just requesting /wp-admin, nothing else) -- purely for the
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
  "/.env.backup",
  "/.git/config",
  "/.git/HEAD",
  "/administrator",
  "/administrator/index.php",
  "/phpmyadmin",
  "/config.php",
  "/wp-config.php.bak",
  "/.aws/credentials",
  "/actuator/env",
  "/actuator/health",
  "/server-status",
  "/.DS_Store",
  "/backup.zip",
  "/backup.sql",
  "/database.sql",
  "/dump.sql",
  "/.svn/entries",
  "/_profiler",
  "/telescope",
  "/console/",
  "/debug/pprof/",
  "/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php",
  "/solr/admin/",
]);

interface AttackSignature {
  type: string;
  pattern?: RegExp;
  taunts: string[];
}

// Recognized attack payload patterns, checked against pathname + query
// string (never against admin-authenticated inputs or POST bodies -- see
// the isAdminOrApi exclusion in proxy() below). Each is deliberately
// specific to real attack syntax, not generic words, to keep false
// positives on ordinary URLs at effectively zero. None of these techniques
// actually work against this app (static site, no raw SQL, no template
// engine reading user input, no Java/PHP runtime, no server-side URL
// fetching) -- this is about recognizing and calling out the attempt, not
// about anything here being exploitable.
const ATTACK_SIGNATURES: AttackSignature[] = [
  {
    type: "log4shell",
    pattern: /\$\{jndi:/i,
    taunts: [
      "It's 2026 and people still try Log4Shell. Bless.",
      "${jndi:this-is-a-static-site-with-no-java-anywhere}",
      "CVE-2021-44228, still getting attempted, still finding zero Java runtimes here.",
    ],
  },
  {
    type: "sqli",
    pattern:
      /(\bunion\b(\s|%20|\/\*.*?\*\/)+\bselect\b)|('\s*or\s*'?1'?\s*=\s*'?1)|(;\s*drop\s+table)|(\bxp_cmdshell\b)|(\bsleep\(\s*\d)|(\bbenchmark\(\s*\d)|(\bor\s+1\s*=\s*1\b)/i,
    taunts: [
      "Bobby Tables says hi.",
      "There's no database query to inject -- just a REST call with your payload sitting there, inert.",
      "DROP TABLE your expectations.",
      "1=1? Sure, that's also true and equally useless here.",
    ],
  },
  {
    type: "xss",
    pattern: /<script[\s>/]|javascript:\s*[a-z]|on(error|load)\s*=\s*['"]?[a-z]|<img[^>]+onerror|<svg[^>]+onload/i,
    taunts: [
      "Cute payload. No eval, no innerHTML, and a CSP that says no anyway.",
      "You can't script your way out of a 404.",
      "alert(1)? Groundbreaking.",
      "This response ships with a CSP that laughs at you.",
    ],
  },
  {
    type: "path_traversal",
    pattern: /(\.\.\/){2,}|(\.\.\\){2,}|\/etc\/passwd\b|\/windows\/win\.ini/i,
    taunts: [
      "There's no /etc/passwd here, just serverless functions.",
      "../../still just a 404.",
      "This isn't a filesystem. It never was.",
    ],
  },
  {
    type: "command_injection",
    pattern: /;\s*(cat|ls|whoami|pwd|uname|nc|curl|wget)\s|\|\s*(nc|bash|sh)\s|\$\([a-z]+.{0,30}\)/i,
    taunts: ["No shell to pop.", "That pipe goes nowhere.", "$(this) doesn't execute here."],
  },
  {
    type: "ssrf",
    pattern: /169\.254\.169\.254|metadata\.google|gopher:\/\/|dict:\/\/|file:\/\//i,
    taunts: [
      "No internal network to pivot to. This is a static site, not a corporate intranet.",
      "169.254.169.254 has nothing for you here -- Vercel functions don't expose that metadata endpoint anyway.",
      "SSRF needs a server willing to fetch your URL. This one isn't.",
    ],
  },
  {
    type: "nosql_injection",
    pattern: /\$where\b|\$ne\b|\$gt\b|\$regex\b/i,
    taunts: [
      "No MongoDB to confuse here.",
      "$where does that lead? Nowhere.",
      "NoSQL injection needs a NoSQL database in the request path. This app's is Postgres, and it's not reachable from a URL.",
    ],
  },
  {
    type: "template_injection",
    pattern: /\{\{.{0,15}(7\*7|config|self|request)/i,
    taunts: [
      "{{7*7}} = still 404, not 49.",
      "No template engine here to inject into -- just static JSX rendered at build time.",
      "SSTI needs a template. This is a compiled React tree.",
    ],
  },
  {
    type: "deserialization",
    pattern: /rO0AB|aced0005|O:\d+:"|__PHP_Incomplete_Class/i,
    taunts: [
      "No Java or PHP deserialization happening on this Next.js app.",
      "That gadget chain has nowhere to land.",
      "Nice serialized payload. Wrong runtime entirely.",
    ],
  },
  {
    type: "crlf_injection",
    pattern: /\r\n\s*(set-cookie|location|content-length)\s*:|\r\n\r\n/i,
    taunts: ["Header injection needs headers this app reflects back. It doesn't.", "%0d%0a won't split anything here.", "CRLF? More like see-ya."],
  },
  {
    type: "file_inclusion",
    pattern: /php:\/\/(filter|input)|expect:\/\/|zip:\/\//i,
    taunts: ["php://filter needs PHP. This is Node.", "No file includes here to hijack.", "Wrong stack for that one entirely."],
  },
  {
    type: "prototype_pollution",
    pattern: /__proto__|constructor(\s|%20|\.)*prototype/i,
    taunts: ["__proto__ pollution needs a vulnerable merge function on the other end. Not finding one here.", "Nice attempt at a prototype that isn't listening."],
  },
  {
    type: "graphql_probe",
    pattern: /__schema\b|__typename.{0,10}query|introspectionquery/i,
    taunts: ["There's no GraphQL API here to introspect.", "__schema? This site doesn't have one of those."],
  },
  {
    type: "xxe",
    pattern: /<!ENTITY|<!DOCTYPE[^>]*SYSTEM/i,
    taunts: [
      "No XML parser here to feed an external entity to.",
      "XXE needs something parsing XML. This app speaks JSON.",
      "<!ENTITY still just text to a Next.js route.",
    ],
  },
  {
    type: "struts_ognl",
    // The classic Struts2 OGNL RCE payload family (CVE-2017-5638 and
    // friends) starts with this exact marker regardless of which specific
    // gadget chain follows.
    pattern: /#_memberaccess|ognl\.ognlcontext|multipart\/form-data'\)\.\(/i,
    taunts: [
      "No Struts2 here, no OGNL context to escape.",
      "#_memberAccess has nothing to access on a Node runtime.",
      "That's a great Struts2 RCE. Wrong framework by about three languages.",
    ],
  },
  {
    type: "spring4shell",
    pattern: /class\.module\.classloader|classloader\.resources\.context/i,
    taunts: [
      "No Spring, no Tomcat, no classloader to reach through.",
      "class.module.classLoader is a great pivot -- for a Java app. This isn't one.",
      "Spring4Shell needs Spring. This is React.",
    ],
  },
  {
    type: "ldap_injection",
    pattern: /\*\)\(|\)\(uid=|\)\(cn=|\)\(objectclass=/i,
    taunts: [
      "No LDAP directory here to filter-inject.",
      "*)(uid=* needs an actual directory service behind it. This is a REST call to Postgres.",
      "Nice LDAP filter. Wrong protocol entirely.",
    ],
  },
  {
    type: "xpath_injection",
    pattern: /count\(\/\*\)|'\s*or\s*''\s*=\s*''|\/\*\[position\(\)/i,
    taunts: [
      "No XML document here to XPath into.",
      "count(/*) counts nothing -- there's no XML tree to walk.",
      "XPath injection needs XPath. This app doesn't parse XML at all.",
    ],
  },
  {
    type: "ssi_injection",
    pattern: /<!--#(exec|include|echo|config)\b/i,
    taunts: [
      "No SSI-enabled web server here to run that directive.",
      "<!--#exec is a relic. This is a Next.js edge function.",
      "Server-side includes haven't been a thing on this stack, ever.",
    ],
  },
  {
    type: "php_cgi_argument_injection",
    // CVE-2024-4577 -- the PHP-CGI argument-injection RCE. Real payloads
    // smuggle a soft hyphen (U+00AD, arrives as %AD) past PHP-CGI's
    // argument parser to inject php.ini directives; after decoding, the
    // directive names themselves are specific enough to match alone.
    pattern: /allow_url_include\s*=|auto_prepend_file\s*=.{0,10}php:\/\/input/i,
    taunts: [
      "CVE-2024-4577 is a good one. Still needs PHP-CGI, which this app has never run.",
      "allow_url_include=1 has nothing to turn on here -- no PHP interpreter exists in this stack.",
      "Nice argument-injection payload. Node doesn't parse CGI arguments.",
    ],
  },
  {
    type: "jwt_none_alg",
    pattern: /"alg"\s*:\s*"none"|eyJhbGciOiJub25lIn0/i,
    taunts: [
      "No JWT verification here to downgrade to \"none\".",
      "alg: none needs a server that trusts the alg header. This one doesn't issue or verify JWTs at all.",
      "Algorithm confusion needs an algorithm to confuse. There isn't one in the request path.",
    ],
  },
  {
    type: "open_redirect",
    pattern: /[?&](redirect|return|next|url|continue)=(https?:\/\/|\/\/[a-z0-9])/i,
    taunts: ["Nice open-redirect attempt. This app validates its own next= params server-side.", "That URL isn't taking anyone anywhere but back here."],
  },
];

// User-Agent fingerprints for common vuln scanners / recon tools. Checked
// separately from the payload signatures above since this is about WHO is
// asking, not WHAT they're asking for.
const SCANNER_TOOL_SIGNATURE: AttackSignature = {
  type: "scanner_tool",
  // Deliberately offensive-tool names only -- never generic HTTP client
  // strings like "curl" or "python-requests", which legitimate uptime
  // monitors and health checks also use constantly. Every name here is a
  // dedicated pentest/recon/exploitation tool with no everyday use.
  pattern:
    /sqlmap|nikto|nmap|masscan|nuclei|gobuster|dirbuster|acunetix|w3af|zgrab|nessus|wpscan|feroxbuster|\bffuf\b|\bdirb\b|whatweb|metasploit|burp\s*collaborator|owasp[\s-]?zap|\bzap\b|hydra|medusa|wfuzz|patator|commix|xsser|beef|rustscan|naabu|amass|arachni|skipfish|\bvega\b|netsparker|qualys|nexpose|shodan|censys|jaeles|\bkatana\b/i,
  taunts: [
    "Automated tool detected. Automated boredom incoming.",
    "Nice scanner. Still just a 404.",
    "Running a tool doesn't make it a vulnerability.",
    "sqlmap, nikto, whatever -- same 404 either way.",
    "That's a real recon toolkit pointed at a portfolio site. Respect the effort, deny the request.",
  ],
};

// CVE-2014-6271, the original Shellshock marker. Historically exploited by
// CGI scripts that fed the User-Agent (or Referer) header straight into a
// bash environment variable -- there's no CGI or bash anywhere in this
// app's request path, but the payload shape is unmistakable and iconic
// enough to deserve its own callout rather than folding into a generic
// bucket.
const SHELLSHOCK_SIGNATURE: AttackSignature = {
  type: "shellshock",
  pattern: /\(\)\s*\{\s*:\s*;\s*\}\s*;/,
  taunts: [
    "() { :; }; -- Shellshock, still getting tried in 2026. There's no bash CGI script reading your headers here.",
    "CVE-2014-6271 says hi. This isn't 2014, and there's no shell to shock.",
    "Nice function definition. Nowhere to execute it.",
  ],
};

// A real browser always sends a Host header matching the URL bar exactly --
// there's essentially no way for ordinary traffic to send anything else, so
// this has close to zero false-positive risk. A mismatched Host is either a
// cache-poisoning attempt, a password-reset-poisoning probe, or a raw
// script hitting the origin directly with a spoofed Host to bypass
// domain-based routing/logic. No `pattern` needed -- checked directly
// against the allowlist below instead of via the generic regex loop.
const HOST_HEADER_SIGNATURE: AttackSignature = {
  type: "host_header_injection",
  taunts: [
    "That Host header doesn't match anything this app is supposed to answer for.",
    "Nice Host header spoofing attempt. This app doesn't route on it blindly.",
    "Cache poisoning needs a cache that trusts your Host header. This one doesn't.",
  ],
};
const EXPECTED_HOST_PATTERN = /^(www\.)?oliverstraus\.com$|\.vercel\.app$|^localhost(:\d+)?$/i;

// request.nextUrl.search/.pathname are the RAW percent-encoded values as
// received -- never auto-decoded by the URL API -- so a payload like
// `${jndi:` arrives as `%24%7Bjndi%3A` and every pattern above would silently
// never match without this. Decoded up to 3 times (not just once) to catch
// double/triple-encoding, a standard WAF-evasion trick (%2524%257B decodes
// to %24%7B decodes to ${). Caps at 3 and bails on malformed sequences
// instead of throwing -- a decode failure just means "test the raw string,"
// never a broken response.
function decodeForScanning(value: string): string {
  let decoded = value;
  for (let i = 0; i < 3; i++) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      break;
    }
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function detectAttack(
  pathname: string,
  search: string,
  userAgent: string | null,
  referer: string | null,
  host: string | null,
): AttackSignature | null {
  // Query strings conventionally allow "+" as an alternate encoding for a
  // space (the application/x-www-form-urlencoded convention every browser
  // and curl use for GET params), which decodeURIComponent does NOT
  // translate -- "1%27+OR+%271%27%3D%271" decodes to "1'+OR+'1'='1", with
  // literal "+" gluing "OR" directly onto the surrounding quotes, so \s*
  // in the patterns above never gets a whitespace character to match.
  // Normalized only in the query portion, since a literal "+" in a
  // pathname isn't a space encoding.
  const target = decodeForScanning(pathname) + decodeForScanning(search).replace(/\+/g, " ");
  // Referer is checked too -- header-injection / log-poisoning payloads
  // often ride in Referer rather than the URL itself, and it's just as
  // attacker-controlled as the query string.
  const refererTarget = referer ? decodeForScanning(referer) : "";
  for (const sig of ATTACK_SIGNATURES) {
    if (sig.pattern!.test(target) || (refererTarget && sig.pattern!.test(refererTarget))) return sig;
  }
  if (userAgent) {
    if (SCANNER_TOOL_SIGNATURE.pattern!.test(userAgent)) return SCANNER_TOOL_SIGNATURE;
    if (SHELLSHOCK_SIGNATURE.pattern!.test(userAgent)) return SHELLSHOCK_SIGNATURE;
  }
  if (referer && SHELLSHOCK_SIGNATURE.pattern!.test(referer)) return SHELLSHOCK_SIGNATURE;
  if (host && !EXPECTED_HOST_PATTERN.test(host)) return HOST_HEADER_SIGNATURE;
  return null;
}

function pickTaunt(sig: AttackSignature | null): string {
  const pool = sig ? sig.taunts : HONEYPOT_TAUNTS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

const DDOS_TAUNTS = [
  "That's not a DDoS, that's just enthusiasm. Also, blocked.",
  "Whatever this was building up to, Vercel's edge already absorbed it -- this is just the aftermath.",
  "Flooding a static site behind a CDN is a lot of effort for a repeated 404.",
  "Rate detected. Rate declined.",
  "A dozen requests a second isn't a botnet, it's a script with no rate limiter. Either way: blocked.",
];

const FLOOD_WINDOW_SECONDS = 30;
const FLOOD_THRESHOLD = 5;

// A lightweight volumetric check -- NOT a substitute for real DDoS
// protection (Vercel's own edge network handles true network-layer floods
// before a request ever reaches this code; see the SpikeTable note on
// /admin/security). This only asks "has this exact source hit a honeypot
// or attack signature this many times in the last 30 seconds," reusing the
// honeypot_hits table that's already being written to on this path -- no
// new infrastructure, and no cost added to ordinary page views, since this
// only ever runs after something has already matched isHoneypotPath or
// attackSignature.
async function checkFloodPattern(ipHash: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const since = new Date(Date.now() - FLOOD_WINDOW_SECONDS * 1000).toISOString();
  try {
    const res = await fetch(
      `${url}/rest/v1/honeypot_hits?select=id&ip_hash=eq.${ipHash}&created_at=gte.${since}`,
      {
        method: "HEAD",
        headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
      },
    );
    if (!res.ok) return false;
    const count = Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
    return count >= FLOOD_THRESHOLD;
  } catch {
    return false;
  }
}

async function logHoneypotHit(
  request: NextRequest,
  path: string,
  clientIp: string,
  attackType: string | null,
  trusted: boolean,
) {
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
        attack_type: attackType,
      }),
    });
  } catch {
    // logging must never break the (fake) response
  }

  // A honeypot-path hit or a recognized attack payload is a 100% reliable
  // "this isn't legitimate traffic" signal -- auto-block on the spot,
  // unless this hash has ever successfully logged into admin (that's
  // Oliver, not an attacker; `trusted` is computed once by the caller).
  // Combined with the session-first ordering in proxyAdmin and the
  // credential-first ordering in loginAdmin, a false positive here can
  // never actually lock him out.
  if (trusted) return;
  try {
    await fetch(`${url}/rest/v1/blocked_ips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        ip_hash,
        reason: attackType ? `Auto-blocked: ${attackType} attempt at ${path}` : `Auto-blocked: honeypot hit at ${path}`,
      }),
    });
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

function escapeHtml(value: string): string {
  return value.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
}

// "Do you want to see a magic trick?" -- a native <details>/<summary>
// disclosure, no JavaScript at all, so it works regardless of CSP and can't
// be mistaken for anything script-driven. The "trick" is just handing the
// requester their own IP back -- not sensitive (it's the one piece of data
// they already necessarily know about themselves), same category as any
// "what's my IP" site. Nothing about any OTHER visitor is ever in this
// response.
//
// Styled as a terminal window (title-bar dots, monospace log lines, a
// blinking cursor) purely via a <style> block -- no JavaScript, no
// external assets, everything inline so this single response is fully
// self-contained. `path` and `clientIp` are attacker-influenced and always
// escaped before insertion; `taunt` and the category label are drawn from
// this file's own fixed string arrays, never from request input.
function honeypotHtml(taunt: string, clientIp: string, path: string, attackType: string | null): string {
  const shownIp = clientIp === "unknown" ? "suspiciously well-hidden. Nice." : clientIp;
  const escapedIp = escapeHtml(shownIp);
  const escapedPath = escapeHtml(path);
  const categoryTag = attackType
    ? `<span class="tag">[${escapeHtml(attackTypeLabel(attackType).toUpperCase())}]</span>`
    : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>404</title>
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 0%, #131824 0%, #06070a 65%);
  font-family: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
  color: #e5e7eb; padding: 2rem;
}
.term {
  width: 100%; max-width: 38rem; border: 1px solid #232837; border-radius: 12px;
  background: #0b0d12; box-shadow: 0 24px 70px -24px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.02);
  overflow: hidden;
}
.term-bar {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px;
  background: #10131c; border-bottom: 1px solid #1c2029;
}
.dot { width: 11px; height: 11px; border-radius: 50%; }
.dot.r { background: #ff5f56; } .dot.y { background: #ffbd2e; } .dot.g { background: #27c93f; }
.term-title { margin-left: 6px; font-size: 12px; color: #6b7280; letter-spacing: .02em; }
.term-body { padding: 26px 24px 24px; }
.line { margin: 0 0 8px; line-height: 1.65; font-size: 14px; word-break: break-word; }
.prompt { color: #4ade80; }
.status { color: #f87171; }
.tag { color: #fbbf24; font-weight: 600; margin-left: 6px; }
.taunt { margin-top: 14px; font-size: 15.5px; color: #f3f4f6; }
.cursor {
  display: inline-block; width: 8px; height: 1.1em; background: #7dd3fc;
  margin-left: 3px; vertical-align: -2px; animation: blink 1s step-end infinite;
}
@keyframes blink { 50% { opacity: 0; } }
details { margin-top: 20px; }
summary {
  cursor: pointer; color: #7dd3fc; list-style: none; display: inline-flex; align-items: center;
  gap: 6px; padding: 9px 16px; border: 1px solid #1c3a4d; border-radius: 999px;
  background: rgba(125,211,252,.06); transition: background .15s ease, border-color .15s ease;
  font-size: 13px;
}
summary::-webkit-details-marker { display: none; }
summary::before { content: "✨"; font-size: 12px; }
summary:hover { background: rgba(125,211,252,.15); border-color: #7dd3fc; }
.reveal {
  margin-top: 12px; padding: 12px 14px; border-radius: 8px; background: #0d1420;
  border: 1px solid #1c2029; color: #9ca3af; font-size: 13.5px;
}
.reveal .ip { color: #f3f4f6; font-weight: 600; }
</style>
</head>
<body>
<div class="term">
  <div class="term-bar">
    <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
    <span class="term-title">guest@oliverstraus.com</span>
  </div>
  <div class="term-body">
    <p class="line"><span class="prompt">$</span> GET ${escapedPath}</p>
    <p class="line status">→ 404 Not Found${categoryTag}</p>
    <p class="line taunt">${taunt}<span class="cursor"></span></p>
    <details>
      <summary>Want to see a magic trick? Click here.</summary>
      <div class="reveal">Your IP is <span class="ip">${escapedIp}</span>. Ta-da.</div>
    </details>
  </div>
</div>
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
  // hits/attack payloads now auto-block their source (see logHoneypotHit) --
  // if Oliver ever trips one himself (new IP he's poking at for testing)
  // while already holding a valid session, this ordering is what stops
  // that from locking him out of his own dashboard. A valid session cookie
  // is proof of identity strong enough to override a coarse IP-level block.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return null;

  const ipHash = await hashIp(getClientIp(request));
  if (await isIpBlocked(ipHash)) return blocked();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const adminResponse = await proxyAdmin(request);
  if (adminResponse) return adminResponse;

  const contentSecurityPolicy = buildCspHeader();

  const isHoneypotPath = HONEYPOT_PATHS.has(pathname);
  // Attack-signature scanning only runs on public routes. /admin/* is
  // Oliver's own authenticated territory (search boxes, note fields, block
  // reasons -- inputs that could legitimately contain unusual characters),
  // and /api/* already has its own Zod validation; neither needs this on
  // top, and scanning them risks false positives against his own use.
  const isAdminOrApi = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/");
  const attackSignature = isAdminOrApi
    ? null
    : detectAttack(
        pathname,
        search,
        request.headers.get("user-agent"),
        request.headers.get("referer"),
        request.headers.get("host"),
      );

  if (isHoneypotPath || attackSignature) {
    const clientIp = getClientIp(request);
    const ipHash = await hashIp(clientIp);
    const trusted = await isTrustedIp(ipHash);

    // A honeypot-path hit never has a real page underneath -- always show
    // the taunt regardless of trust (only the auto-block below is skipped
    // for a trusted source). An attack signature on a REAL page is
    // different: if it's Oliver testing his own site's actual behavior
    // (trusted), let the real page render normally instead of losing it to
    // a joke response -- that's exactly the kind of testing he's supposed
    // to be able to do here.
    if (isHoneypotPath || !trusted) {
      // Only checked once we're already about to intercept -- a source
      // repeatedly hammering a honeypot/attack signature in a short window
      // gets the DDoS-flavored taunt instead of (or alongside) the
      // specific category, since the volumetric behavior is the more
      // urgent signal. The real underlying category is still what gets
      // logged, so the security page's breakdown stays accurate.
      const flooding = !trusted && (await checkFloodPattern(ipHash));
      const loggedType = attackSignature?.type ?? (flooding ? "flood_pattern" : null);
      // Awaited, not fire-and-forget, specifically because checkFloodPattern
      // above depends on THIS request's write being visible to the very
      // next request's count query -- a fire-and-forget insert here raced
      // ahead of rapid consecutive hits landing in time to be counted,
      // silently undercounting a real flood. This path already does
      // several other awaited round-trips (hash, trust check, flood
      // check); one more doesn't change the trade-off, and nothing here is
      // UX-critical for a real visitor.
      await logHoneypotHit(request, pathname, clientIp, loggedType, trusted);
      const taunt = flooding ? DDOS_TAUNTS[Math.floor(Math.random() * DDOS_TAUNTS.length)]! : pickTaunt(attackSignature);
      const displayPath = pathname + search;
      return new NextResponse(honeypotHtml(taunt, clientIp, displayPath, loggedType), {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": contentSecurityPolicy,
        },
      });
    }
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
