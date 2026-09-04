import { countBy, csvDownloadHref, supabaseReadHeaders, toCsv } from "@/lib/admin-stats";

// Never prerendered (auth-gated, needs a live DB read every time).
export const dynamic = "force-dynamic";

interface PageViewRow {
  path: string;
  referrer: string | null;
  ip_hash: string;
  user_agent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  language: string | null;
  duration_ms: number | null;
  created_at: string;
}

// How many of the most recent rows the breakdown stats (top paths, top
// referrers, unique visitors, etc.) are computed over. `totalViews` below is
// a real exact count of every row ever written, independent of this cap --
// only the breakdowns are a recent-window sample. Plenty of headroom for a
// personal site's traffic; revisit with a real SQL aggregate (a Postgres
// view or RPC function) if this ever needs to cover more history than one
// REST fetch can hold.
const SAMPLE_SIZE = 5000;

// Deliberately not a real UA-parsing library -- a personal site's traffic
// is overwhelmingly mainstream browsers/OSes, and a dependency buys more
// precision than the stats dashboard needs. Order matters: Edge and Opera
// both contain "Chrome" in their UA string, so they're checked first.
function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua)) return "Safari";
  if (/bot|crawler|spider|bingpreview/i.test(ua)) return "Bot / crawler";
  return "Other";
}

function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

function deviceType(row: PageViewRow): string {
  if (row.viewport_width) {
    if (row.viewport_width < 640) return "Mobile";
    if (row.viewport_width < 1024) return "Tablet";
    return "Desktop";
  }
  if (row.user_agent && /mobi|android/i.test(row.user_agent)) return "Mobile";
  return "Unknown";
}

// document.referrer arrives as a full URL ("https://www.google.com/search?q=...");
// grouping by hostname instead of the raw string is what makes "top
// referrers" actually useful rather than one row per unique query string.
function referrerLabel(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

interface Visitor {
  ipHash: string;
  visitCount: number;
  firstSeen: string;
  lastSeen: string;
  location: string;
  rows: PageViewRow[];
}

function groupByVisitor(rows: PageViewRow[]): Visitor[] {
  const byHash = new Map<string, PageViewRow[]>();
  for (const row of rows) {
    const list = byHash.get(row.ip_hash) ?? [];
    list.push(row);
    byHash.set(row.ip_hash, list);
  }

  const visitors: Visitor[] = [...byHash.entries()].map(([ipHash, visitRows]) => {
    // Rows arrive newest-first (the query is ordered that way); the last
    // element of each group is that visitor's oldest sampled row.
    const sorted = [...visitRows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const newest = sorted[0]!;
    const oldest = sorted[sorted.length - 1]!;
    return {
      ipHash,
      visitCount: sorted.length,
      firstSeen: oldest.created_at,
      lastSeen: newest.created_at,
      location: [newest.city, newest.region, newest.country].filter(Boolean).join(", ") || "Unknown",
      rows: sorted,
    };
  });

  return visitors.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
}

async function getStats() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const [countRes, rowsRes] = await Promise.all([
    fetch(`${url}/rest/v1/page_views?select=id`, {
      method: "HEAD",
      headers: { ...supabaseReadHeaders(key), Prefer: "count=exact" },
      cache: "no-store",
    }),
    fetch(
      `${url}/rest/v1/page_views?select=path,referrer,ip_hash,user_agent,country,region,city,viewport_width,viewport_height,language,duration_ms,created_at&order=created_at.desc&limit=${SAMPLE_SIZE}`,
      { headers: supabaseReadHeaders(key), cache: "no-store" },
    ),
  ]);

  const totalViews = Number(countRes.headers.get("content-range")?.split("/")[1] ?? 0);
  const rows = (await rowsRes.json()) as PageViewRow[];

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const viewsLast24h = rows.filter((r) => now - new Date(r.created_at).getTime() < DAY_MS).length;
  const viewsLast7d = rows.filter((r) => now - new Date(r.created_at).getTime() < 7 * DAY_MS).length;
  const uniqueVisitors = new Set(rows.map((r) => r.ip_hash)).size;

  const durations = rows.map((r) => r.duration_ms).filter((d): d is number => d != null && d > 0);
  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    : null;

  const csv = toCsv(
    rows.map((r) => ({
      created_at: r.created_at,
      path: r.path,
      referrer: r.referrer ?? "",
      country: r.country ?? "",
      region: r.region ?? "",
      city: r.city ?? "",
      language: r.language ?? "",
      duration_ms: r.duration_ms ?? "",
      ip_hash: r.ip_hash,
    })),
  );

  return {
    totalViews,
    sampleSize: rows.length,
    uniqueVisitors,
    viewsLast24h,
    viewsLast7d,
    avgDurationMs,
    csvHref: csvDownloadHref(csv),
    topPaths: countBy(rows.map((r) => r.path), "(unknown)"),
    topReferrers: countBy(rows.map((r) => referrerLabel(r.referrer)), "Direct / no referrer"),
    topCountries: countBy(rows.map((r) => r.country), "Unknown"),
    topBrowsers: countBy(rows.map((r) => (r.user_agent ? parseBrowser(r.user_agent) : null)), "Unknown"),
    topOS: countBy(rows.map((r) => (r.user_agent ? parseOS(r.user_agent) : null)), "Unknown"),
    topDeviceTypes: countBy(rows.map((r) => deviceType(r)), "Unknown"),
    topLanguages: countBy(rows.map((r) => r.language), "Unknown"),
    visitors: groupByVisitor(rows),
  };
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="mt-3 space-y-1.5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        {rows.map(([key, count]) => (
          <div key={key} className="flex items-center justify-between gap-4 text-sm">
            <span className="truncate text-foreground/80">{key}</span>
            <span className="shrink-0 font-mono text-foreground">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisitorRow({ visitor }: { visitor: Visitor }) {
  return (
    <details className="border-t border-border/50 [&_summary::-webkit-details-marker]:hidden">
      <summary className="grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-foreground/[0.03]">
        <span className="truncate font-mono text-foreground/80">{visitor.ipHash.slice(0, 12)}&hellip;</span>
        <span className="text-foreground/80">{visitor.location}</span>
        <span className="font-mono text-foreground">
          {visitor.visitCount} visit{visitor.visitCount === 1 ? "" : "s"}
        </span>
        <span className="whitespace-nowrap text-muted-foreground">
          {new Date(visitor.lastSeen).toLocaleString()}
        </span>
      </summary>
      <div className="bg-foreground/[0.02] px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          First seen {new Date(visitor.firstSeen).toLocaleString()}
        </p>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 pr-4 font-mono text-[11px] uppercase tracking-widest">Time</th>
              <th className="py-1 pr-4 font-mono text-[11px] uppercase tracking-widest">Path</th>
              <th className="py-1 pr-4 font-mono text-[11px] uppercase tracking-widest">Duration</th>
              <th className="py-1 pr-4 font-mono text-[11px] uppercase tracking-widest">Referrer</th>
              <th className="py-1 font-mono text-[11px] uppercase tracking-widest">Browser</th>
            </tr>
          </thead>
          <tbody>
            {visitor.rows.map((row, i) => (
              <tr key={`${row.created_at}-${i}`}>
                <td className="whitespace-nowrap py-1 pr-4 text-foreground/80">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="py-1 pr-4 text-foreground/80">{row.path}</td>
                <td className="py-1 pr-4 text-foreground/80">
                  {row.duration_ms ? formatDuration(row.duration_ms) : "—"}
                </td>
                <td className="max-w-[16rem] truncate py-1 pr-4 text-foreground/80">
                  {row.referrer || "Direct"}
                </td>
                <td className="py-1 text-foreground/80">
                  {row.user_agent ? `${parseBrowser(row.user_agent)} / ${parseOS(row.user_agent)}` : "Unknown"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default async function AdminStatsPage() {
  const stats = await getStats();

  if (!stats) {
    return (
      <>
        <h1 className="text-2xl font-bold">Stats unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          Supabase env vars aren&apos;t configured on this environment.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight">Visitor stats</h1>
        <a
          href={stats.csvHref}
          download="page_views.csv"
          className="font-mono text-xs uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Download CSV
        </a>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Breakdowns are computed over the {stats.sampleSize.toLocaleString()} most recent page views.
        Total views is an exact count of everything ever logged. Every visitor is identified only by a
        salted, one-way hash of their IP -- the raw address is never stored.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total views (all-time)" value={stats.totalViews.toLocaleString()} />
        <StatCard label="Unique visitors (sample)" value={stats.uniqueVisitors.toLocaleString()} />
        <StatCard label="Last 24 hours" value={stats.viewsLast24h.toLocaleString()} />
        <StatCard label="Last 7 days" value={stats.viewsLast7d.toLocaleString()} />
        <StatCard
          label="Avg. time on page"
          value={stats.avgDurationMs ? formatDuration(stats.avgDurationMs) : "—"}
        />
        <StatCard label="Visitors tracked" value={stats.visitors.length.toLocaleString()} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BreakdownTable title="Top pages" rows={stats.topPaths} />
        <BreakdownTable title="Top referrers" rows={stats.topReferrers} />
        <BreakdownTable title="Top countries" rows={stats.topCountries} />
        <BreakdownTable title="Browsers" rows={stats.topBrowsers} />
        <BreakdownTable title="Operating systems" rows={stats.topOS} />
        <BreakdownTable title="Device type" rows={stats.topDeviceTypes} />
        <BreakdownTable title="Languages" rows={stats.topLanguages} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <p className="border-b border-border p-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Visitors ({stats.visitors.length}) &mdash; click a row for their full visit history
        </p>
        {stats.visitors.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No visitors yet.</p>
        )}
        {stats.visitors.map((visitor) => (
          <VisitorRow key={visitor.ipHash} visitor={visitor} />
        ))}
      </div>
    </>
  );
}
