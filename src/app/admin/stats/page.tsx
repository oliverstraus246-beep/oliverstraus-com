import type { Metadata } from "next";

// Never prerendered (auth-gated, needs a live DB read every time) and never
// indexed -- robots.txt disallows /admin too, but that's a request, not
// enforcement; the actual gate is proxy.ts's Basic Auth check, which runs
// before this component ever executes.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface PageViewRow {
  path: string;
  referrer: string | null;
  ip_hash: string;
  country: string | null;
  region: string | null;
  city: string | null;
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

function supabaseHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function getStats() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const [countRes, rowsRes] = await Promise.all([
    fetch(`${url}/rest/v1/page_views?select=id`, {
      method: "HEAD",
      headers: { ...supabaseHeaders(key), Prefer: "count=exact" },
      cache: "no-store",
    }),
    fetch(
      `${url}/rest/v1/page_views?select=path,referrer,ip_hash,country,region,city,created_at&order=created_at.desc&limit=${SAMPLE_SIZE}`,
      { headers: supabaseHeaders(key), cache: "no-store" },
    ),
  ]);

  const totalViews = Number(countRes.headers.get("content-range")?.split("/")[1] ?? 0);
  const rows = (await rowsRes.json()) as PageViewRow[];

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const viewsLast24h = rows.filter((r) => now - new Date(r.created_at).getTime() < DAY_MS).length;
  const viewsLast7d = rows.filter((r) => now - new Date(r.created_at).getTime() < 7 * DAY_MS).length;
  const uniqueVisitors = new Set(rows.map((r) => r.ip_hash)).size;

  const countBy = (values: (string | null)[], fallback: string) => {
    const counts = new Map<string, number>();
    for (const raw of values) {
      const key = raw?.trim() || fallback;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  };

  return {
    totalViews,
    sampleSize: rows.length,
    uniqueVisitors,
    viewsLast24h,
    viewsLast7d,
    topPaths: countBy(rows.map((r) => r.path), "(unknown)"),
    topReferrers: countBy(
      rows.map((r) => r.referrer),
      "Direct / no referrer",
    ),
    topCountries: countBy(rows.map((r) => r.country), "Unknown"),
    recent: rows.slice(0, 50),
  };
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

export default async function AdminStatsPage() {
  const stats = await getStats();

  if (!stats) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16 text-foreground">
        <h1 className="text-2xl font-bold">Stats unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          Supabase env vars aren&apos;t configured on this environment.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 text-foreground">
      <h1 className="text-3xl font-black tracking-tight">Visitor stats</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Breakdowns are computed over the {stats.sampleSize.toLocaleString()} most recent page views.
        Total views is an exact count of everything ever logged.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total views (all-time)" value={stats.totalViews.toLocaleString()} />
        <StatCard label="Unique visitors (sample)" value={stats.uniqueVisitors.toLocaleString()} />
        <StatCard label="Last 24 hours" value={stats.viewsLast24h.toLocaleString()} />
        <StatCard label="Last 7 days" value={stats.viewsLast7d.toLocaleString()} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BreakdownTable title="Top pages" rows={stats.topPaths} />
        <BreakdownTable title="Top referrers" rows={stats.topReferrers} />
        <BreakdownTable title="Top countries" rows={stats.topCountries} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <p className="border-b border-border p-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Recent visits
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Time</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Path</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Location</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Referrer</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map((row, i) => (
              <tr key={`${row.created_at}-${i}`} className="border-t border-border/50">
                <td className="whitespace-nowrap px-4 py-2 text-foreground/80">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-foreground/80">{row.path}</td>
                <td className="px-4 py-2 text-foreground/80">
                  {[row.city, row.region, row.country].filter(Boolean).join(", ") || "Unknown"}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-foreground/80">
                  {row.referrer || "Direct"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
