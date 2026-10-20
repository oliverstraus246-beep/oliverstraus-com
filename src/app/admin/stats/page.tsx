import Link from "next/link";
import { blockIp, unblockIp } from "@/app/admin/actions";
import {
  campaignLabel,
  type Channel,
  classifyChannel,
  computeConversionRate,
  computeEngagementScore,
  computeHighIntent,
  computeLifecycleStage,
  countBy,
  csvDownloadHref,
  deviceType,
  formatDuration,
  groupIntoSessions,
  HIGH_INTENT_PATHS,
  type LifecycleStage,
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
  visitor_id: string | null;
  timezone: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  max_scroll_pct: number | null;
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
// The breakdown tables above already cap at top-10 each (countBy's default
// limit), so they can never grow unbounded. The visitor list had no such
// cap -- every unique ip_hash in the 5000-row sample rendered as its own
// row, meaning the page's DOM size grew linearly with how many people had
// ever visited, forever. This paginates the RENDERED list only; the
// underlying query/breakdowns are untouched.
const VISITORS_PER_PAGE = 25;

interface Visitor {
  ipHash: string;
  ipAddress: string | null;
  visitorId: string | null;
  visitCount: number;
  firstSeen: string;
  lastSeen: string;
  location: string;
  country: string;
  active: boolean;
  note: string;
  sessionCount: number;
  pagesPerSession: number;
  bounceRate: number;
  highIntent: boolean;
  hasDownloaded: boolean;
  maxScrollPct: number;
  channel: Channel;
  engagementScore: number;
  lifecycleStage: LifecycleStage;
}

const SORTS = {
  recent: { label: "Most recent", compare: (a: Visitor, b: Visitor) => (a.lastSeen < b.lastSeen ? 1 : -1) },
  visits: { label: "Most visits", compare: (a: Visitor, b: Visitor) => b.visitCount - a.visitCount },
  first: { label: "Newest visitor", compare: (a: Visitor, b: Visitor) => (a.firstSeen < b.firstSeen ? 1 : -1) },
  engaged: { label: "Most engaged", compare: (a: Visitor, b: Visitor) => b.engagementScore - a.engagementScore },
} as const;
type SortKey = keyof typeof SORTS;
function isSortKey(v: string): v is SortKey {
  return v in SORTS;
}

function groupByVisitor(
  rows: PageViewRow[],
  notes: Map<string, string>,
  contactedSet: Set<string>,
  downloadedSet: Set<string>,
): Visitor[] {
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
    const session = groupIntoSessions(sorted.map((r) => r.created_at));
    const maxDurationMs = Math.max(0, ...sorted.map((r) => r.duration_ms ?? 0));
    const maxScrollPct = Math.max(0, ...sorted.map((r) => r.max_scroll_pct ?? 0));
    const viewedKeyPage = sorted.some((r) => HIGH_INTENT_PATHS.has(r.path));
    const hasDownloaded = downloadedSet.has(ipHash);
    const contacted = contactedSet.has(ipHash);
    const highIntent = computeHighIntent({ viewedKeyPage, maxDurationMs, maxScrollPct, contacted, downloaded: hasDownloaded });
    return {
      ipHash,
      ipAddress: newest.ip_address,
      visitorId: sorted.find((r) => r.visitor_id)?.visitor_id ?? null,
      visitCount: sorted.length,
      firstSeen: oldest.created_at,
      lastSeen: newest.created_at,
      location: [newest.city, newest.region, newest.country].filter(Boolean).join(", ") || "Unknown",
      country: newest.country ?? "Unknown",
      active,
      note: notes.get(ipHash) ?? "",
      sessionCount: session.sessionCount,
      pagesPerSession: session.pagesPerSession,
      bounceRate: session.bounceRate,
      hasDownloaded,
      maxScrollPct,
      highIntent,
      // First-touch attribution: the OLDEST sampled view's referrer/UTM, not
      // the newest -- "how did this person originally find me," the
      // standard marketing-analytics convention, rather than whatever they
      // happened to click most recently.
      channel: classifyChannel(referrerLabel(oldest.referrer), oldest.utm_source, oldest.utm_medium),
      engagementScore: computeEngagementScore({
        sessionCount: session.sessionCount,
        maxDurationMs,
        maxScrollPct,
        bounceRate: session.bounceRate,
        contacted,
        downloaded: hasDownloaded,
      }),
      lifecycleStage: computeLifecycleStage({
        visitCount: sorted.length,
        highIntent,
        contacted,
        downloaded: hasDownloaded,
      }),
    };
  });

  return visitors;
}

interface StatsFilters {
  path: string;
  q: string;
  country: string;
  downloadedOnly: boolean;
  returningOnly: boolean;
}

async function getStats(filters: StatsFilters, sort: SortKey) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const pathFilter = filters.path;
  const filterQuery = pathFilter ? `&path=ilike.*${encodeURIComponent(pathFilter)}*` : "";

  const [countRes, rowsRes, blockedRes, notesRes, contactsRes, downloadsRes, redirectClicksRes, resumeDownloadCountRes] =
    await Promise.all([
      fetch(`${url}/rest/v1/page_views?select=id${filterQuery}`, {
        method: "HEAD",
        headers: { ...supabaseReadHeaders(key), Prefer: "count=exact" },
        cache: "no-store",
      }),
      fetch(
        `${url}/rest/v1/page_views?select=path,referrer,ip_hash,ip_address,user_agent,country,region,city,viewport_width,viewport_height,language,duration_ms,created_at,visitor_id,timezone,utm_source,utm_medium,utm_campaign,max_scroll_pct&order=created_at.desc&limit=${SAMPLE_SIZE}${filterQuery}`,
        { headers: supabaseReadHeaders(key), cache: "no-store" },
      ),
      fetch(`${url}/rest/v1/blocked_ips?select=ip_hash`, { headers: supabaseReadHeaders(key), cache: "no-store" }),
      fetch(`${url}/rest/v1/visitor_notes?select=ip_hash,note`, { headers: supabaseReadHeaders(key), cache: "no-store" }),
      fetch(`${url}/rest/v1/contact_submissions?select=ip_hash&limit=${SAMPLE_SIZE}`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/download_events?select=ip_hash,project&limit=${SAMPLE_SIZE}`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/resume_redirect_clicks?select=src,created_at&order=created_at.desc&limit=2000`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/download_events?select=id&project=eq.resume`, {
        method: "HEAD",
        headers: { ...supabaseReadHeaders(key), Prefer: "count=exact" },
        cache: "no-store",
      }),
    ]);

  const totalViews = Number(countRes.headers.get("content-range")?.split("/")[1] ?? 0);
  // A 400 here (e.g. the visitor_id/resume_redirect_clicks migration hasn't
  // been applied to this environment yet) must degrade to "no data", never
  // crash the whole dashboard on a malformed-JSON-as-array cast.
  const rows = rowsRes.ok ? ((await rowsRes.json()) as PageViewRow[]) : [];
  const blockedSet = new Set(blockedRes.ok ? ((await blockedRes.json()) as { ip_hash: string }[]).map((b) => b.ip_hash) : []);
  const notes = new Map(
    notesRes.ok ? ((await notesRes.json()) as { ip_hash: string; note: string }[]).map((n) => [n.ip_hash, n.note]) : [],
  );
  const contactedSet = new Set(
    contactsRes.ok ? ((await contactsRes.json()) as { ip_hash: string }[]).map((c) => c.ip_hash) : [],
  );
  const downloadEvents = downloadsRes.ok ? ((await downloadsRes.json()) as { ip_hash: string; project: string }[]) : [];
  const downloadedSet = new Set(downloadEvents.map((d) => d.ip_hash));
  const resumeDownloaderSet = new Set(downloadEvents.filter((d) => d.project === "resume").map((d) => d.ip_hash));
  const redirectClicks = redirectClicksRes.ok
    ? ((await redirectClicksRes.json()) as { src: string | null; created_at: string }[])
    : [];
  const resumeDownloadCount = Number(resumeDownloadCountRes.headers.get("content-range")?.split("/")[1] ?? 0);

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const viewsLast24h = rows.filter((r) => now - new Date(r.created_at).getTime() < DAY_MS).length;
  const viewsLast7d = rows.filter((r) => now - new Date(r.created_at).getTime() < 7 * DAY_MS).length;
  const uniqueVisitors = new Set(rows.map((r) => r.ip_hash)).size;

  const durations = rows.map((r) => r.duration_ms).filter((d): d is number => d != null && d > 0);
  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    : null;

  const scrollDepths = rows.map((r) => r.max_scroll_pct).filter((d): d is number => d != null);
  const avgScrollPct = scrollDepths.length
    ? Math.round(scrollDepths.reduce((sum, d) => sum + d, 0) / scrollDepths.length)
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

  let visitors = groupByVisitor(rows, notes, contactedSet, downloadedSet);

  // Visitor-list filters beyond the path filter above (which narrows the
  // underlying page_views query itself). These four operate on the already-
  // grouped, already-sampled visitor list -- cheap in-memory filters, no
  // extra round trip, consistent with how this page treats its 5000-row
  // sample everywhere else.
  const q = filters.q.trim().toLowerCase();
  if (q) visitors = visitors.filter((v) => v.note.toLowerCase().includes(q));
  if (filters.country) visitors = visitors.filter((v) => v.country === filters.country);
  if (filters.downloadedOnly) visitors = visitors.filter((v) => v.hasDownloaded);
  if (filters.returningOnly) visitors = visitors.filter((v) => v.visitCount > 1);

  visitors = visitors.sort(SORTS[sort].compare);

  // Unique viewers of /resume within the same sampled window the rest of
  // this page already uses -- consistent with "breakdowns are computed over
  // the N most recent page views" rather than a separate exact query.
  const resumeViewerSet = new Set(rows.filter((r) => r.path === "/resume").map((r) => r.ip_hash));
  const redirectClicksBySrc = countBy(
    redirectClicks.map((c) => c.src),
    "(no src tag)",
  );

  return {
    totalViews,
    sampleSize: rows.length,
    uniqueVisitors,
    viewsLast24h,
    viewsLast7d,
    avgDurationMs,
    avgScrollPct,
    csvHref: csvDownloadHref(csv),
    topPaths: countBy(rows.map((r) => r.path), "(unknown)"),
    topReferrers: countBy(rows.map((r) => referrerLabel(r.referrer)), "Direct / no referrer"),
    topCountries: countBy(rows.map((r) => r.country), "Unknown"),
    topBrowsers: countBy(rows.map((r) => (r.user_agent ? parseBrowser(r.user_agent) : null)), "Unknown"),
    topOS: countBy(rows.map((r) => (r.user_agent ? parseOS(r.user_agent) : null)), "Unknown"),
    topDeviceTypes: countBy(rows.map((r) => deviceType(r.viewport_width, r.user_agent)), "Unknown"),
    topLanguages: countBy(rows.map((r) => r.language), "Unknown"),
    topTimezones: countBy(rows.map((r) => r.timezone), "Unknown"),
    topCampaigns: countBy(
      rows.map((r) => campaignLabel(r.utm_source, r.utm_medium)).filter((c): c is string => c != null),
      "(unknown)",
    ),
    // Per-visitor, first-touch -- not per-row. A row-level breakdown would
    // drown in "Referral" noise from internal route changes (the 2nd+ page
    // view in a session has the SITE ITSELF as document.referrer), which
    // tells you nothing about actual acquisition.
    topChannels: countBy(
      visitors.map((v) => v.channel),
      "Direct",
    ),
    lifecycleCounts: countBy(
      visitors.map((v) => v.lifecycleStage),
      "New",
      5,
    ),
    visitors,
    activeNow: visitors.filter((v) => v.active),
    blockedSet,
    resume: {
      uniqueViewers: resumeViewerSet.size,
      uniqueDownloaders: resumeDownloaderSet.size,
      conversionRate: computeConversionRate(resumeViewerSet.size, resumeDownloaderSet.size),
      downloadCount: resumeDownloadCount,
      redirectClickCount: redirectClicks.length,
      redirectClicksBySrc,
    },
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

// Ordered earliest-to-latest in the pipeline, with the tone each stage's
// badge/strip segment uses -- shared by LifecycleStrip (the aggregate funnel
// below) and VisitorRow (the per-visitor badge) so the two always agree on
// what color a stage is.
const LIFECYCLE_TONES: Record<LifecycleStage, string> = {
  New: "text-muted-foreground border-border",
  Returning: "text-accent-blue border-accent-blue/40",
  Engaged: "text-emerald-400 border-emerald-400/40",
  Lead: "text-amber-400 border-amber-400/40",
  Customer: "text-emerald-400 border-emerald-400/40",
};
const LIFECYCLE_ORDER: LifecycleStage[] = ["New", "Returning", "Engaged", "Lead", "Customer"];

function LifecycleStrip({ counts }: { counts: [string, number][] }) {
  const byStage = new Map(counts);
  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Pipeline &mdash; every tracked visitor, by lifecycle stage
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {LIFECYCLE_ORDER.map((stage) => (
          <div key={stage} className={`rounded-lg border px-3 py-2 ${LIFECYCLE_TONES[stage]}`}>
            <p className="font-mono text-[11px] uppercase tracking-widest">{stage}</p>
            <p className="mt-1 text-2xl font-black tracking-tight">{byStage.get(stage) ?? 0}</p>
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
        <span className="block truncate text-[11px] text-muted-foreground">via {visitor.channel}</span>
        {visitor.note && <span className="block truncate text-xs text-accent-blue/80">&ldquo;{visitor.note}&rdquo;</span>}
        <div className="mt-1 flex flex-wrap gap-1">
          <span
            title="Lifecycle stage -- see the Pipeline summary above"
            className={`rounded-full border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${LIFECYCLE_TONES[visitor.lifecycleStage]}`}
          >
            {visitor.lifecycleStage}
          </span>
        </div>
      </div>
      <div className="font-mono text-foreground">
        <div className="whitespace-nowrap">
          {visitor.visitCount} visit{visitor.visitCount === 1 ? "" : "s"}
          {visitor.visitCount > 1 && <span className="ml-1 text-emerald-400" title="Returning visitor">&bull;</span>}
        </div>
        {visitor.sessionCount > 0 && (
          <div
            className="whitespace-nowrap text-[11px] font-normal text-muted-foreground"
            title="Sessions -- page views grouped by a 30-minute gap -- the share of those that were a single page (a bounce) -- and a 0-100 engagement score (time on page, scroll depth, repeat visits, contacting, downloading)"
          >
            {visitor.sessionCount} session{visitor.sessionCount === 1 ? "" : "s"} &middot; {visitor.bounceRate}% bounce
            &middot; score {visitor.engagementScore}
          </div>
        )}
      </div>
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

interface ResumeStats {
  uniqueViewers: number;
  uniqueDownloaders: number;
  conversionRate: number;
  downloadCount: number;
  redirectClickCount: number;
  redirectClicksBySrc: [string, number][];
}

function ResumeSection({ resume }: { resume: ResumeStats }) {
  return (
    <div id="resume" className="mt-6 scroll-mt-24 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Résumé</p>
        <Link
          href="/admin/downloads"
          className="font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Full download log &rarr;
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Unique viewers</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-foreground">{resume.uniqueViewers}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Unique downloaders</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-foreground">{resume.uniqueDownloaders}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">View &rarr; download</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-foreground">{resume.conversionRate}%</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Total downloads</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-foreground">{resume.downloadCount}</p>
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Off-site redirect clicks ({resume.redirectClickCount}) &mdash; links through{" "}
          <code className="text-foreground/80">/r/resume?src=...</code>, e.g. an email signature or LinkedIn
        </p>
        {resume.redirectClickCount === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No tracked redirect clicks yet.</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BreakdownTable title="By source" rows={resume.redirectClicksBySrc} />
          </div>
        )}
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{
    path?: string;
    sort?: string;
    page?: string;
    q?: string;
    country?: string;
    downloaded?: string;
    returning?: string;
  }>;
}

export default async function AdminStatsPage({ searchParams }: PageProps) {
  const {
    path: pathFilter = "",
    sort: sortParam = "recent",
    page: pageParam = "1",
    q = "",
    country = "",
    downloaded,
    returning,
  } = await searchParams;
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "recent";
  const filters: StatsFilters = {
    path: pathFilter,
    q,
    country,
    downloadedOnly: downloaded === "1",
    returningOnly: returning === "1",
  };
  const stats = await getStats(filters, sort);

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

  const totalPages = Math.max(1, Math.ceil(stats.visitors.length / VISITORS_PER_PAGE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const pageVisitors = stats.visitors.slice((page - 1) * VISITORS_PER_PAGE, page * VISITORS_PER_PAGE);

  const activeFilterParams = {
    ...(pathFilter ? { path: pathFilter } : {}),
    ...(q ? { q } : {}),
    ...(country ? { country } : {}),
    ...(filters.downloadedOnly ? { downloaded: "1" } : {}),
    ...(filters.returningOnly ? { returning: "1" } : {}),
  };

  function pageHref(targetPage: number) {
    const params = new URLSearchParams({ ...activeFilterParams, sort, page: String(targetPage) });
    return `?${params.toString()}`;
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight">Visitors</h1>
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

      <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="path"
          defaultValue={pathFilter}
          placeholder="Path, e.g. /work"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-blue focus:outline-none"
        />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search your notes"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-blue focus:outline-none"
        />
        <select
          name="country"
          defaultValue={country}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-accent-blue focus:outline-none"
        >
          <option value="">Any country</option>
          {stats.topCountries.map(([c]) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-foreground/80">
          <input type="checkbox" name="downloaded" value="1" defaultChecked={filters.downloadedOnly} />
          Downloaded
        </label>
        <label className="flex items-center gap-1.5 text-sm text-foreground/80">
          <input type="checkbox" name="returning" value="1" defaultChecked={filters.returningOnly} />
          Returning only
        </label>
        <button
          type="submit"
          className="font-mono text-xs uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Filter
        </button>
        {(pathFilter || q || country || filters.downloadedOnly || filters.returningOnly) && (
          <a href="/admin/stats" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Clear
          </a>
        )}
      </form>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-8">
        <StatCard label="Active now" value={stats.activeNow.length} live={stats.activeNow.length > 0} />
        <StatCard label="Total views (all-time)" value={stats.totalViews.toLocaleString()} />
        <StatCard label="Unique visitors (sample)" value={stats.uniqueVisitors.toLocaleString()} />
        <StatCard label="Last 24 hours" value={stats.viewsLast24h.toLocaleString()} />
        <StatCard label="Last 7 days" value={stats.viewsLast7d.toLocaleString()} />
        <StatCard
          label="Avg. time on page"
          value={stats.avgDurationMs ? formatDuration(stats.avgDurationMs) : "—"}
        />
        <StatCard label="Avg. scroll depth" value={stats.avgScrollPct != null ? `${stats.avgScrollPct}%` : "—"} />
        <StatCard label="Visitors tracked" value={stats.visitors.length.toLocaleString()} />
      </div>

      <LifecycleStrip counts={stats.lifecycleCounts} />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BreakdownTable title="Top pages" rows={stats.topPaths} />
        <BreakdownTable title="Top channels" rows={stats.topChannels} />
        <BreakdownTable title="Top referrers" rows={stats.topReferrers} />
        <BreakdownTable title="Top countries" rows={stats.topCountries} />
        <BreakdownTable title="Browsers" rows={stats.topBrowsers} />
        <BreakdownTable title="Operating systems" rows={stats.topOS} />
        <BreakdownTable title="Device type" rows={stats.topDeviceTypes} />
        <BreakdownTable title="Languages" rows={stats.topLanguages} />
        <BreakdownTable title="Timezones" rows={stats.topTimezones} />
        <BreakdownTable title="Campaigns (UTM)" rows={stats.topCampaigns} />
      </div>

      <ResumeSection resume={stats.resume} />

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
                href={`?${new URLSearchParams({ ...activeFilterParams, sort: key }).toString()}`}
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
        {pageVisitors.map((visitor) => (
          <VisitorRow key={visitor.ipHash} visitor={visitor} blocked={stats.blockedSet.has(visitor.ipHash)} />
        ))}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-border p-4">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-4">
              {page > 1 ? (
                <a
                  href={pageHref(page - 1)}
                  className="font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
                >
                  &larr; Prev
                </a>
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/40">
                  &larr; Prev
                </span>
              )}
              {page < totalPages ? (
                <a
                  href={pageHref(page + 1)}
                  className="font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
                >
                  Next &rarr;
                </a>
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/40">
                  Next &rarr;
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
