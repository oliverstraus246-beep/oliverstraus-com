import { countBy, supabaseReadHeaders } from "@/lib/admin-stats";

// Never prerendered (auth-gated, needs a live DB read every time).
export const dynamic = "force-dynamic";

interface DownloadEventRow {
  id: string;
  created_at: string;
  project: string;
  platform: string;
  version: string;
}

interface DownloadReleaseRow {
  project: string;
  platform: string;
  version: string;
  size_bytes: number;
  created_at: string;
}

async function getDownloadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const headers = supabaseReadHeaders(key);
  const [countRes, eventsRes, releasesRes] = await Promise.all([
    fetch(`${url}/rest/v1/download_events?select=id`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact" },
      cache: "no-store",
    }),
    fetch(`${url}/rest/v1/download_events?select=*&order=created_at.desc&limit=500`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${url}/rest/v1/download_releases?select=*&is_current=eq.true&order=platform.asc`, {
      headers,
      cache: "no-store",
    }),
  ]);

  const totalDownloads = Number(countRes.headers.get("content-range")?.split("/")[1] ?? 0);
  const events = eventsRes.ok ? ((await eventsRes.json()) as DownloadEventRow[]) : [];
  const releases = releasesRes.ok ? ((await releasesRes.json()) as DownloadReleaseRow[]) : [];
  const byPlatform = countBy(
    events.map((e) => e.platform),
    "unknown",
  );

  return { totalDownloads, events, releases, byPlatform };
}

export default async function AdminDownloadsPage() {
  const data = await getDownloadData();

  if (!data) {
    return (
      <>
        <h1 className="text-3xl font-black tracking-tight">Downloads</h1>
        <p className="mt-8 text-sm text-muted-foreground">Supabase isn&apos;t configured yet.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">Downloads</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Who&apos;s downloading which project, on which platform, and what&apos;s currently published.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Total downloads
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-foreground">
            {data.totalDownloads.toLocaleString()}
          </p>
        </div>
        {data.byPlatform.map(([platform, count]) => (
          <div key={platform} className="rounded-lg border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {platform}
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight text-foreground">{count}</p>
          </div>
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

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Recent downloads
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">When</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Project</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Platform</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Version</th>
            </tr>
          </thead>
          <tbody>
            {data.events.slice(0, 100).map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">{e.project}</td>
                <td className="px-4 py-2">{e.platform}</td>
                <td className="px-4 py-2">{e.version}</td>
              </tr>
            ))}
            {data.events.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
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
