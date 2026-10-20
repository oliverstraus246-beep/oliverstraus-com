// Shared by every page under src/app/admin -- all of them read Supabase
// with the service_role key server-side and reduce to small "top N" lists,
// so this is the one place that logic lives instead of copy-pasted three
// times.
export function supabaseReadHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export function countBy(values: (string | null)[], fallback: string, limit = 10): [string, number][] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw?.trim() || fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

// Minimal CSV writer -- one column set, no nested/multi-line fields beyond
// what double-quoting handles. Good enough for the admin export buttons;
// not a general-purpose CSV library.
export function toCsv(rows: Record<string, string | number | boolean | null>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(String(row[h] ?? ""))).join(","));
  }
  return lines.join("\n");
}

export function csvDownloadHref(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

// Deliberately not a real UA-parsing library -- a personal site's traffic is
// overwhelmingly mainstream browsers/OSes, and a dependency buys more
// precision than the admin dashboard needs. Order matters: Edge and Opera
// both contain "Chrome" in their UA string, so they're checked first.
export function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua)) return "Safari";
  if (/bot|crawler|spider|bingpreview/i.test(ua)) return "Bot / crawler";
  return "Other";
}

export function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

export function deviceType(viewportWidth: number | null, userAgent: string | null): string {
  if (viewportWidth) {
    if (viewportWidth < 640) return "Mobile";
    if (viewportWidth < 1024) return "Tablet";
    return "Desktop";
  }
  if (userAgent && /mobi|android/i.test(userAgent)) return "Mobile";
  return "Unknown";
}

// document.referrer arrives as a full URL ("https://www.google.com/search?q=...");
// grouping by hostname instead of the raw string is what makes "top
// referrers" actually useful rather than one row per unique query string.
export function referrerLabel(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

// How many events from one ip_hash inside any single 60-second window counts
// as an anomaly worth surfacing. This is a burst-detection heuristic over
// this app's OWN logged events (page views, honeypot probes, contact
// submissions) -- it cannot see a true network-layer volumetric flood, which
// Vercel's edge absorbs before a request ever reaches this code. What it
// catches: a script hammering real pages/paths faster than any human would,
// which is the shape an application-layer DoS attempt (or an aggressive
// scanner) actually takes in this app's own logs.
export const SPIKE_THRESHOLD_PER_MINUTE = 8;

export interface SpikeEvent {
  ipHash: string;
  timestamp: string;
}

export interface Spike {
  ipHash: string;
  peakPerMinute: number;
  totalEvents: number;
  blocked: boolean;
}

// Human-readable labels for src/proxy.ts's ATTACK_SIGNATURES `type` values
// (and the synthetic "flood_pattern" tag from its flood-detection check).
// Shared between the admin security page and the honeypot response page
// itself so both describe a given category the same way.
export const ATTACK_TYPE_LABELS: Record<string, string> = {
  log4shell: "Log4Shell",
  sqli: "SQL injection",
  xss: "XSS",
  path_traversal: "Path traversal",
  command_injection: "Command injection",
  ssrf: "SSRF",
  nosql_injection: "NoSQL injection",
  template_injection: "Template injection (SSTI)",
  deserialization: "Insecure deserialization",
  crlf_injection: "CRLF injection",
  file_inclusion: "File inclusion (LFI/RFI)",
  prototype_pollution: "Prototype pollution",
  graphql_probe: "GraphQL introspection probe",
  open_redirect: "Open redirect attempt",
  xxe: "XXE",
  struts_ognl: "Struts2 OGNL injection",
  spring4shell: "Spring4Shell",
  ldap_injection: "LDAP injection",
  xpath_injection: "XPath injection",
  ssi_injection: "SSI injection",
  php_cgi_argument_injection: "PHP-CGI argument injection",
  jwt_none_alg: "JWT alg:none",
  host_header_injection: "Host header injection",
  scanner_tool: "Known scanner tool",
  shellshock: "Shellshock",
  flood_pattern: "Flood / DoS pattern",
};

export function attackTypeLabel(type: string | null): string {
  if (!type) return "Trap path (no payload)";
  return ATTACK_TYPE_LABELS[type] ?? type;
}

// A 30-minute gap between page views is the conventional web-analytics
// session boundary (GA, Plausible, etc. all default to it) -- long enough
// that a visitor reading one long article doesn't get split into two
// sessions, short enough that "closed the tab, came back after dinner" reads
// as a new one.
const SESSION_GAP_MINUTES = 30;

export interface SessionSummary {
  sessionCount: number;
  pagesPerSession: number;
  bounceRate: number;
}

// Clusters a visitor's page-view timestamps into discrete sessions (a gap of
// SESSION_GAP_MINUTES+ starts a new one) and summarizes them -- richer than
// the flat "N visits" count the visitor list showed before: two people who
// both have 10 page views read very differently if one is 10 sessions of a
// single bounced page and the other is 2 real sessions of 5 pages each.
export function groupIntoSessions(timestamps: string[], gapMinutes = SESSION_GAP_MINUTES): SessionSummary {
  if (timestamps.length === 0) return { sessionCount: 0, pagesPerSession: 0, bounceRate: 0 };

  const sorted = [...timestamps].sort();
  const gapMs = gapMinutes * 60_000;
  const sessionSizes: number[] = [1];
  for (let i = 1; i < sorted.length; i++) {
    const gap = new Date(sorted[i]!).getTime() - new Date(sorted[i - 1]!).getTime();
    if (gap > gapMs) {
      sessionSizes.push(1);
    } else {
      sessionSizes[sessionSizes.length - 1]!++;
    }
  }

  const bounces = sessionSizes.filter((size) => size === 1).length;
  return {
    sessionCount: sessionSizes.length,
    pagesPerSession: Math.round((timestamps.length / sessionSizes.length) * 10) / 10,
    bounceRate: Math.round((bounces / sessionSizes.length) * 100),
  };
}

// "Stayed for real time" cutoff for the high-intent signal below -- a page
// view with no duration beacon yet (still open) or well under this counts as
// a bounce, not genuine engagement. 10s is short enough that normal reading
// clears it easily, long enough to exclude an instant back-button bounce.
const REAL_TIME_THRESHOLD_MS = 10_000;

// Scrolling past the halfway point of a key page is its own evidence of
// engagement, independent of duration -- someone who reads fast (or left the
// tab open without reading) can fail the time cutoff above while still
// having genuinely gone through the résumé.
const SCROLL_DEPTH_THRESHOLD_PCT = 50;

// The pages a view of, combined with real time spent, counts as "worth a
// second look" for the high-intent signal below -- the résumé and the
// companies/projects page are the two destinations that actually indicate
// someone is evaluating Oliver rather than just landing on the homepage.
// Shared by the visitor list and the per-visitor profile page.
export const HIGH_INTENT_PATHS = new Set(["/resume", "/work"]);

export interface IntentSignals {
  viewedKeyPage: boolean;
  maxDurationMs: number;
  // 0-100, the deepest scroll reached on any view in scope. Defaults to 0
  // (no signal) for callers that predate src/lib/scroll-depth.ts.
  maxScrollPct?: number;
  contacted: boolean;
  downloaded: boolean;
}

// A scannable "worth a second look" flag for the visitor list and profile
// page: viewed the résumé or work page AND actually engaged with it (stuck
// around, or scrolled through it -- either is real signal on its own), or
// they went further and contacted Oliver or downloaded something outright.
// Deliberately a boolean badge, not a score -- the ask was "Oliver can scan
// the list and know who's worth a second look," not a ranking model.
export function computeHighIntent(signals: IntentSignals): boolean {
  if (signals.contacted || signals.downloaded) return true;
  if (!signals.viewedKeyPage) return false;
  return (
    signals.maxDurationMs >= REAL_TIME_THRESHOLD_MS ||
    (signals.maxScrollPct ?? 0) >= SCROLL_DEPTH_THRESHOLD_PCT
  );
}

// Combines a page view's UTM source + medium into one label for the "Top
// campaigns" breakdown -- null when neither is set, so that breakdown can
// drop rows with no campaign tag entirely instead of showing a wall of
// "(unknown)".
export function campaignLabel(source: string | null, medium: string | null): string | null {
  if (!source && !medium) return null;
  return [source, medium].filter(Boolean).join(" / ");
}

// Résumé view -> download conversion rate, as a percentage with one decimal
// place (a personal site's résumé traffic is small enough that rounding to a
// whole percent would flatten "1 of 6" and "1 of 11" to the same number).
export function computeConversionRate(uniqueViewers: number, uniqueDownloaders: number): number {
  if (uniqueViewers <= 0) return 0;
  return Math.round((uniqueDownloaders / uniqueViewers) * 1000) / 10;
}

export type Channel = "Direct" | "Paid" | "Email" | "Social" | "Organic search" | "Referral";

// Hostnames checked against referrerLabel's output (already stripped to a
// bare hostname, "www." dropped) -- not exhaustive, just the sources a
// personal portfolio site actually sees traffic from.
const SEARCH_ENGINE_HOSTS = new Set([
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "baidu.com",
  "yandex.com",
]);
const SOCIAL_HOSTS = new Set([
  "facebook.com",
  "l.facebook.com",
  "instagram.com",
  "l.instagram.com",
  "linkedin.com",
  "lm.facebook.com",
  "t.co",
  "x.com",
  "twitter.com",
  "reddit.com",
  "tiktok.com",
  "threads.net",
]);

// The standard marketing-analytics "channel grouping" concept (GA4, HubSpot,
// etc. all compute something like this) -- one coarse label for "broadly,
// where did this visit come from," derived from signals already stored, not
// anything new collected. UTM tags take priority over referrer guessing
// since they're an explicit, deliberate tag rather than an inference.
export function classifyChannel(
  referrerHost: string | null,
  utmSource: string | null,
  utmMedium: string | null,
): Channel {
  const medium = utmMedium?.toLowerCase() ?? "";
  if (/cpc|ppc|paid|display|ads?$/.test(medium)) return "Paid";
  if (/email/.test(medium)) return "Email";
  if (/social/.test(medium) || (utmSource && SOCIAL_HOSTS.has(utmSource.toLowerCase()))) return "Social";
  if (utmSource) return "Referral";
  if (!referrerHost) return "Direct";
  if (SEARCH_ENGINE_HOSTS.has(referrerHost)) return "Organic search";
  if (SOCIAL_HOSTS.has(referrerHost)) return "Social";
  return "Referral";
}

export interface EngagementInputs {
  sessionCount: number;
  maxDurationMs: number;
  maxScrollPct: number;
  bounceRate: number;
  contacted: boolean;
  downloaded: boolean;
}

// A 0-100 lead-scoring-style number (the kind a CRM computes per contact) --
// layered on top of the computeHighIntent boolean, not a replacement for it:
// the badge is for scanning the list, this is for ranking it (the visitor
// list's "Most engaged" sort). Weights sum to 100 at full marks on every
// factor; each factor maxes out independently so no single signal can starve
// the others out.
export function computeEngagementScore(inputs: EngagementInputs): number {
  const durationScore = Math.min(inputs.maxDurationMs / 120_000, 1) * 25; // 2min+ = full marks
  const scrollScore = (inputs.maxScrollPct / 100) * 20;
  const lowBounceScore = inputs.sessionCount > 0 ? (1 - inputs.bounceRate / 100) * 15 : 0;
  const returningScore = inputs.sessionCount > 1 ? 15 : 0;
  const contactedScore = inputs.contacted ? 15 : 0;
  const downloadedScore = inputs.downloaded ? 10 : 0;
  const total = durationScore + scrollScore + lowBounceScore + returningScore + contactedScore + downloadedScore;
  return Math.round(Math.max(0, Math.min(100, total)));
}

export type LifecycleStage = "New" | "Returning" | "Engaged" | "Lead" | "Customer";

export interface LifecycleInputs {
  visitCount: number;
  highIntent: boolean;
  contacted: boolean;
  downloaded: boolean;
}

// The CRM-pipeline-stage framing (subscriber/lead/customer, in HubSpot's own
// terms) applied to a personal site's visitors -- one glanceable label
// instead of several separate badges saying overlapping things. "Customer"
// here means "downloaded something" (the résumé or a project), not a real
// purchase -- there's nothing for sale here, but it's the closest real
// equivalent to a conversion this site has. Precedence: a real two-way
// conversation (Lead) outranks a one-way download (Customer), which
// outranks passive engagement, which outranks mere repeat visits.
export function computeLifecycleStage(inputs: LifecycleInputs): LifecycleStage {
  if (inputs.contacted) return "Lead";
  if (inputs.downloaded) return "Customer";
  if (inputs.highIntent) return "Engaged";
  if (inputs.visitCount > 1) return "Returning";
  return "New";
}

export function detectSpikes(events: SpikeEvent[], blockedSet: Set<string>): Spike[] {
  const byIp = new Map<string, string[]>();
  for (const e of events) {
    const list = byIp.get(e.ipHash) ?? [];
    list.push(e.timestamp);
    byIp.set(e.ipHash, list);
  }

  const spikes: Spike[] = [];
  for (const [ipHash, timestamps] of byIp.entries()) {
    const minuteBuckets = new Map<string, number>();
    for (const t of timestamps) {
      // Bucket key = the timestamp truncated to the minute -- a coarser but
      // much cheaper stand-in for a true sliding 60s window.
      const bucket = t.slice(0, 16); // "YYYY-MM-DDTHH:MM"
      minuteBuckets.set(bucket, (minuteBuckets.get(bucket) ?? 0) + 1);
    }
    const peak = Math.max(...minuteBuckets.values());
    if (peak >= SPIKE_THRESHOLD_PER_MINUTE) {
      spikes.push({ ipHash, peakPerMinute: peak, totalEvents: timestamps.length, blocked: blockedSet.has(ipHash) });
    }
  }

  return spikes.sort((a, b) => b.peakPerMinute - a.peakPerMinute);
}
