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
