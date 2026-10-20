import Link from "next/link";
import { countBy, supabaseReadHeaders } from "@/lib/admin-stats";

// Never prerendered (auth-gated, needs a live DB read every time).
export const dynamic = "force-dynamic";

interface DownloadEventRow {
  id: string;
  created_at: string;
  project: string;
  platform: string;
  version: string;
  ip_hash: string;
}

interface DownloadReleaseRow {
  project: string;
  platform: string;
  version: string;
  size_bytes: number;
  created_at: string;
}

interface Download extends DownloadEventRow {
  ipAddress: string | null;
  note: string;
  blocked: boolean;
}

const SORTS = {
  recent: {
    label: "Most recent",
    compare: (a: Download, b: Download) => (a.created_at < b.created_at ? 1 : -1),
  },
  project: {
    label: "Project",
    compare: (a: Download, b: Download) =>
      a.project.localeCompare(b.project) || (a.created_at < b.created_at ? 1 : -1),
  },
  platform: {
    label: "Platform",
    compare: (a: Download, b: Download) =>
      a.platform.localeCompare(b.platform) || (a.created_at < b.created_at ? 1 : -1),
  },
} as const;
type SortKey = keyof typeof SORTS;
function isSortKey(v: string): v is SortKey {
  return v in SORTS;
}

async function getDownloadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const headers = supabaseReadHeaders(key);
  const [countRes, eventsRes, releasesRes, notesRes, blockedRes] = await Promise.all([
    fetch(`${url}/rest/v1/download_events?select=id`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact" },
      cache: "no-store",
    }),
    fetch(
      `${url}/rest/v1/download_events?select=id,created_at,project,platform,version,ip_hash&order=created_at.desc&limit=500`,
      { headers, cache: "no-store" },
    ),
    fetch(`${url}/rest/v1/download_releases?select=*&is_current=eq.true&order=platform.asc`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${url}/rest/v1/visitor_notes?select=ip_hash,note`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/blocked_ips?select=ip_hash`, { headers, cache: "no-store" }),
  ]);

  const totalDownloads = Number(countRes.headers.get("content-range")?.split("/")[1] ?? 0);
  const events = eventsRes.ok ? ((await eventsRes.json()) as DownloadEventRow[]) : [];
  const releases = releasesRes.ok ? ((await releasesRes.json()) as DownloadReleaseRow[]) : [];
  const notes = new Map(
    notesRes.ok
      ? ((await notesRes.json()) as { ip_hash: string; note: string }[]).map((n) => [n.ip_hash, n.note])
      : [],
  );
  const blockedSet = new Set(
    blockedRes.ok ? ((await blockedRes.json()) as { ip_hash: string }[]).map((b) => b.ip_hash) : [],
  );

  // download_events deliberately never stores a raw IP (see the comment on
  // that table in supabase/schema.sql) -- only page_views does. Resolve each
  // downloader's real IP the same way /admin/stats/visitor/[ipHash] does:
  // look up the same ip_hash in page_views and take whichever raw IP turns
  // up there. A downloader who never otherwise loaded a page (e.g. hit the
  // download link directly) just shows as "Unknown IP" -- still fully
  // linked through to their profile via ip_hash either way.
  const distinctHashes = [...new Set(events.map((e) => e.ip_hash))];
  const ipByHash = new Map<string, string>();
  if (distinctHashes.length > 0) {
    const ipRes = await fetch(
      `${url}/rest/v1/page_views?select=ip_hash,ip_address&ip_hash=in.(${distinctHashes.join(",")})&ip_address=not.is.null&order=created_at.desc&limit=5000`,
      { headers, cache: "no-store" },
    );
    if (ipRes.ok) {
      for (const row of (await ipRes.json()) as { ip_hash: string; ip_address: string | null }[]) {
        if (row.ip_address && !ipByHash.has(row.ip_hash)) ipByHash.set(row.ip_hash, row.ip_address);
      }
    }
  }

  const downloads: Download[] = events.map((e) => ({
    ...e,
    ipAddress: ipByHash.get(e.ip_hash) ?? null,
    note: notes.get(e.ip_hash) ?? "",
    blocked: blockedSet.has(e.ip_hash),
  }));

  // The résumé's "platform" is always the literal "pdf" (see
  // src/app/api/resume/download/route.ts) -- it gets its own named stat
  // card below, so excluding it here keeps this breakdown to the real
  // project releases (mac/linux/windows/arch/debian) instead of showing
  // the same count twice under two labels.
  const byPlatform = countBy(
    events.filter((e) => e.project !== "resume").map((e) => e.platform),
    "unknown",
  );
  const resumeDownloads = events.filter((e) => e.project === "resume").length;

  return {
    totalDownloads,
    downloads,
    releases,
    byPlatform,
    uniqueDownloaders: distinctHashes.length,
    resumeDownloads,
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

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function AdminDownloadsPage({ searchParams }: PageProps) {
  const { sort: sortParam = "recent" } = await searchParams;
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "recent";
  const data = await getDownloadData();

  if (!data) {
    return (
      <>
        <h1 className="text-3xl font-black tracking-tight">Downloads</h1>
        <p className="mt-8 text-sm text-muted-foreground">Supabase isn&apos;t configured yet.</p>
      </>
    );
  }

  const sortedDownloads = [...data.downloads].sort(SORTS[sort].compare);

  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">Downloads</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Who&apos;s downloading which project, on which platform, and what&apos;s currently published. For the
        résumé&apos;s view&rarr;download conversion rate and off-site redirect-click breakdown, see the{" "}
        <Link href="/admin/stats#resume" className="text-accent-blue hover:text-accent-blue-dim">
          Résumé section on Visitors
        </Link>
        .
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total downloads" value={data.totalDownloads.toLocaleString()} />
        <StatCard label="Unique downloaders (sample)" value={data.uniqueDownloaders.toLocaleString()} />
        <StatCard label="Résumé downloads" value={data.resumeDownloads.toLocaleString()} />
        {data.byPlatform.map(([platform, count]) => (
          <StatCard key={platform} label={platform} value={count} />
        ))}
      </div>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Currently published
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Project</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Platform</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Version</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Size</th>
            </tr>
          </thead>
          <tbody>
            {data.releases.map((r) => (
              <tr key={`${r.project}-${r.platform}`} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{r.project}</td>
                <td className="px-4 py-2">{r.platform}</td>
                <td className="px-4 py-2">{r.version}</td>
                <td className="px-4 py-2">{(r.size_bytes / 1024 / 1024).toFixed(1)} MB</td>
              </tr>
            ))}
            {data.releases.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                  Nothing published yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Recent downloads ({sortedDownloads.length})
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sort:</span>
          {(Object.keys(SORTS) as SortKey[]).map((key) => (
            <a
              key={key}
              href={`?sort=${key}`}
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
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">When</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Project</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Platform</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Version</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Downloader</th>
            </tr>
          </thead>
          <tbody>
            {sortedDownloads.slice(0, 100).map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">{e.project}</td>
                <td className="px-4 py-2">{e.platform}</td>
                <td className="px-4 py-2">{e.version}</td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/stats/visitor/${e.ip_hash}`}
                    className="font-mono text-accent-blue transition-colors hover:text-accent-blue-dim"
                  >
                    {e.ipAddress ?? "Unknown IP"}
                  </Link>
                  {e.blocked && (
                    <span className="ml-2 rounded-full border border-red-400/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-400">
                      Blocked
                    </span>
                  )}
                  {e.note && (
                    <span className="ml-2 text-xs text-muted-foreground">&ldquo;{e.note}&rdquo;</span>
                  )}
                </td>
              </tr>
            ))}
            {sortedDownloads.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={5}>
                  No downloads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
