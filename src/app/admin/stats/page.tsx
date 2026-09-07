import Link from "next/link";
import { blockIp, unblockIp } from "@/app/admin/actions";
import {
  countBy,
  csvDownloadHref,
  deviceType,
  formatDuration,
  parseBrowser,
  parseOS,
  referrerLabel,
  supabaseReadHeaders,
  toCsv,
} from "@/lib/admin-stats";

// Never prerendered (auth-gated, needs a live DB read every time).
export const dynamic = "force-dynamic";

interface PageViewRow {
  path: string;
  referrer: string | null;
  ip_hash: string;
  ip_address: string | null;
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
const ACTIVE_WINDOW_MINUTES = 5;

interface Visitor {
  ipHash: string;
  ipAddress: string | null;
  visitCount: number;
  firstSeen: string;
  lastSeen: string;
  location: string;
  active: boolean;
  note: string;
}

const SORTS = {
  recent: { label: "Most recent", compare: (a: Visitor, b: Visitor) => (a.lastSeen < b.lastSeen ? 1 : -1) },
  visits: { label: "Most visits", compare: (a: Visitor, b: Visitor) => b.visitCount - a.visitCount },
  first: { label: "Newest visitor", compare: (a: Visitor, b: Visitor) => (a.firstSeen < b.firstSeen ? 1 : -1) },
} as const;
type SortKey = keyof typeof SORTS;
function isSortKey(v: string): v is SortKey {
  return v in SORTS;
}

function groupByVisitor(rows: PageViewRow[], notes: Map<string, string>): Visitor[] {
  const byHash = new Map<string, PageViewRow[]>();
  for (const row of rows) {
    const list = byHash.get(row.ip_hash) ?? [];
    list.push(row);
    byHash.set(row.ip_hash, list);
  }

  const now = Date.now();
  const activeWindowMs = ACTIVE_WINDOW_MINUTES * 60_000;

  const visitors: Visitor[] = [...byHash.entries()].map(([ipHash, visitRows]) => {
    // Rows arrive newest-first (the query is ordered that way); the last
    // element of each group is that visitor's oldest sampled row.
    const sorted = [...visitRows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const newest = sorted[0]!;
    const oldest = sorted[sorted.length - 1]!;
    // "Active" is a heuristic, not a real presence signal: no duration
    // beacon yet (they haven't left/hidden the tab) and the view started
    // recently enough that they haven't just left it open for hours.
    const active = newest.duration_ms == null && now - new Date(newest.created_at).getTime() < activeWindowMs;
    return {
      ipHash,
      ipAddress: newest.ip_address,
      visitCount: sorted.length,
      firstSeen: oldest.created_at,
      lastSeen: newest.created_at,
      location: [newest.city, newest.region, newest.country].filter(Boolean).join(", ") || "Unknown",
      active,
      note: notes.get(ipHash) ?? "",
    };
  });

  return visitors;
}

async function getStats(pathFilter: string, sort: SortKey) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const filterQuery = pathFilter ? `&path=ilike.*${encodeURIComponent(pathFilter)}*` : "";

  const [countRes, rowsRes, blockedRes, notesRes] = await Promise.all([
    fetch(`${url}/rest/v1/page_views?select=id${filterQuery}`, {
      method: "HEAD",
      headers: { ...supabaseReadHeaders(key), Prefer: "count=exact" },
      cache: "no-store",
    }),
    fetch(
      `${url}/rest/v1/page_views?select=path,referrer,ip_hash,ip_address,user_agent,country,region,city,viewport_width,viewport_height,language,duration_ms,created_at&order=created_at.desc&limit=${SAMPLE_SIZE}${filterQuery}`,
      { headers: supabaseReadHeaders(key), cache: "no-store" },
    ),
    fetch(`${url}/rest/v1/blocked_ips?select=ip_hash`, { headers: supabaseReadHeaders(key), cache: "no-store" }),
    fetch(`${url}/rest/v1/visitor_notes?select=ip_hash,note`, { headers: supabaseReadHeaders(key), cache: "no-store" }),
  ]);

  const totalViews = Number(countRes.headers.get("content-range")?.split("/")[1] ?? 0);
  const rows = (await rowsRes.json()) as PageViewRow[];
  const blockedSet = new Set(blockedRes.ok ? ((await blockedRes.json()) as { ip_hash: string }[]).map((b) => b.ip_hash) : []);
  const notes = new Map(
    notesRes.ok ? ((await notesRes.json()) as { ip_hash: string; note: string }[]).map((n) => [n.ip_hash, n.note]) : [],
  );

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
      ip_address: r.ip_address ?? "",
      country: r.country ?? "",
      region: r.region ?? "",
      city: r.city ?? "",
      language: r.language ?? "",
      duration_ms: r.duration_ms ?? "",
      ip_hash: r.ip_hash,
    })),
  );

  const visitors = groupByVisitor(rows, notes).sort(SORTS[sort].compare);

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
    topDeviceTypes: countBy(rows.map((r) => deviceType(r.viewport_width, r.user_agent)), "Unknown"),
    topLanguages: countBy(rows.map((r) => r.language), "Unknown"),
    visitors,
    activeNow: visitors.filter((v) => v.active),
    blockedSet,
  };
}

function StatCard({ label, value, live }: { label: string; value: string | number; live?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {live && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
        )}
        {label}
      </p>
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

function BlockButton({ ipHash, blocked }: { ipHash: string; blocked: boolean }) {
  if (blocked) {
    return (
      <form action={unblockIp}>
        <input type="hidden" name="ipHash" value={ipHash} />
        <button
          type="submit"
          className="font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Unblock
        </button>
      </form>
    );
  }
  return (
    <form action={blockIp}>
      <input type="hidden" name="ipHash" value={ipHash} />
      <input type="hidden" name="reason" value="Blocked from /admin/stats" />
      <button
        type="submit"
        className="font-mono text-[11px] uppercase tracking-widest text-red-400 transition-colors hover:text-red-300"
      >
        Block
      </button>
    </form>
  );
}

function VisitorRow({ visitor, blocked }: { visitor: Visitor; blocked: boolean }) {
  return (
    <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center gap-4 border-t border-border/50 px-4 py-2.5 text-sm transition-colors hover:bg-foreground/[0.03] first:border-t-0">
      {visitor.active ? (
        <span className="relative flex h-2 w-2" title="Active in the last 5 minutes">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
      ) : (
        <span className="h-2 w-2" />
      )}
      <span className="whitespace-nowrap font-mono text-foreground/80">{visitor.ipAddress ?? "Unknown IP"}</span>
      <div className="min-w-0">
        <span className="block truncate text-foreground/80">{visitor.location}</span>
        {visitor.note && <span className="block truncate text-xs text-accent-blue/80">&ldquo;{visitor.note}&rdquo;</span>}
      </div>
      <span className="font-mono text-foreground">
        {visitor.visitCount} visit{visitor.visitCount === 1 ? "" : "s"}
        {visitor.visitCount > 1 && <span className="ml-1 text-emerald-400" title="Returning visitor">&bull;</span>}
      </span>
      <span className="whitespace-nowrap text-muted-foreground">{new Date(visitor.lastSeen).toLocaleString()}</span>
      <Link
        href={`/admin/stats/visitor/${visitor.ipHash}`}
        className="font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
      >
        View profile &rarr;
      </Link>
      <BlockButton ipHash={visitor.ipHash} blocked={blocked} />
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ path?: string; sort?: string }>;
}

export default async function AdminStatsPage({ searchParams }: PageProps) {
  const { path: pathFilter = "", sort: sortParam = "recent" } = await searchParams;
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "recent";
  const stats = await getStats(pathFilter, sort);

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
        Total views is an exact count of everything ever logged. Real IP addresses are stored (not just
        hashed) as of this update -- treat this data with the same care as the rest of your infrastructure
        credentials.
      </p>

      <form method="get" className="mt-4 flex items-center gap-2">
        <input
          type="text"
          name="path"
          defaultValue={pathFilter}
          placeholder="Filter by path, e.g. /work"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-blue focus:outline-none"
        />
        <button
          type="submit"
          className="font-mono text-xs uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Filter
        </button>
        {pathFilter && (
          <a href="/admin/stats" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Clear
          </a>
        )}
      </form>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Active now" value={stats.activeNow.length} live={stats.activeNow.length > 0} />
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Visitors ({stats.visitors.length}) &mdash; open a profile for full history, device, and contact
            cross-reference
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sort:</span>
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <a
                key={key}
                href={`?${new URLSearchParams({ ...(pathFilter ? { path: pathFilter } : {}), sort: key }).toString()}`}
                className={
                  sort === key
                    ? "font-mono text-[11px] uppercase tracking-widest text-accent-blue"
                    : "font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {SORTS[key].label}
              </a>
            ))}
          </div>
        </div>
        {stats.visitors.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No visitors yet.</p>
        )}
        {stats.visitors.map((visitor) => (
          <VisitorRow key={visitor.ipHash} visitor={visitor} blocked={stats.blockedSet.has(visitor.ipHash)} />
        ))}
      </div>
    </>
  );
}
