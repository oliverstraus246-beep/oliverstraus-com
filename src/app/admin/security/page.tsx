import { countBy, csvDownloadHref, supabaseReadHeaders, toCsv } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

interface HoneypotRow {
  id: string;
  created_at: string;
  path: string;
  ip_hash: string;
  user_agent: string | null;
}

interface AdminAttemptRow {
  id: string;
  created_at: string;
  ip_hash: string;
  success: boolean;
}

async function getSecurityData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const [honeypotCountRes, honeypotRowsRes, attemptRowsRes] = await Promise.all([
    fetch(`${url}/rest/v1/honeypot_hits?select=id`, {
      method: "HEAD",
      headers: { ...supabaseReadHeaders(key), Prefer: "count=exact" },
      cache: "no-store",
    }),
    fetch(`${url}/rest/v1/honeypot_hits?select=*&order=created_at.desc&limit=2000`, {
      headers: supabaseReadHeaders(key),
      cache: "no-store",
    }),
    // admin_auth_attempts may not exist yet on a database that hasn't run
    // the latest migration -- treated as "no data" rather than an error.
    fetch(`${url}/rest/v1/admin_auth_attempts?select=*&order=created_at.desc&limit=500`, {
      headers: supabaseReadHeaders(key),
      cache: "no-store",
    }),
  ]);

  const totalHoneypotHits = Number(honeypotCountRes.headers.get("content-range")?.split("/")[1] ?? 0);
  const honeypotHits = honeypotRowsRes.ok ? ((await honeypotRowsRes.json()) as HoneypotRow[]) : [];
  const adminAttempts = attemptRowsRes.ok ? ((await attemptRowsRes.json()) as AdminAttemptRow[]) : [];

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const honeypotLast24h = honeypotHits.filter((r) => now - new Date(r.created_at).getTime() < DAY_MS).length;

  const failedAdminAttempts = adminAttempts.filter((a) => !a.success);
  const failedLast24h = failedAdminAttempts.filter((a) => now - new Date(a.created_at).getTime() < DAY_MS).length;

  const csvHref = csvDownloadHref(
    toCsv(
      honeypotHits.map((h) => ({
        created_at: h.created_at,
        path: h.path,
        ip_hash: h.ip_hash,
        user_agent: h.user_agent ?? "",
      })),
    ),
  );

  return {
    totalHoneypotHits,
    sampleSize: honeypotHits.length,
    honeypotLast24h,
    topScannedPaths: countBy(honeypotHits.map((h) => h.path), "(unknown)"),
    topScannerIps: countBy(honeypotHits.map((h) => h.ip_hash.slice(0, 16)), "(unknown)"),
    recentHoneypotHits: honeypotHits.slice(0, 50),
    csvHref,
    totalAdminAttempts: adminAttempts.length,
    failedAdminAttempts: failedAdminAttempts.length,
    failedLast24h,
    recentFailedAttempts: failedAdminAttempts.slice(0, 20),
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
            <span className="truncate font-mono text-foreground/80">{key}</span>
            <span className="shrink-0 font-mono text-foreground">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminSecurityPage() {
  const data = await getSecurityData();

  if (!data) {
    return (
      <>
        <h1 className="text-2xl font-bold">Security data unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          Supabase env vars aren&apos;t configured on this environment.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight">Security</h1>
        <a
          href={data.csvHref}
          download="honeypot_hits.csv"
          className="font-mono text-xs uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Download CSV
        </a>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Honeypot hits are requests to fake sensitive-looking paths (/wp-admin, /.env, /.git/config, and
        similar) that nothing real is ever mounted at -- a hit means a scanner or bot, never a real visitor.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Honeypot hits (all-time)" value={data.totalHoneypotHits.toLocaleString()} />
        <StatCard label="Last 24 hours" value={data.honeypotLast24h.toLocaleString()} />
        <StatCard label="Failed admin logins (24h)" value={data.failedLast24h.toLocaleString()} />
        <StatCard label="Failed admin logins (sample)" value={data.failedAdminAttempts.toLocaleString()} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BreakdownTable title="Most scanned paths" rows={data.topScannedPaths} />
        <BreakdownTable title="Most active scanner IPs (hashed)" rows={data.topScannerIps} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <p className="border-b border-border p-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Recent honeypot hits
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Time</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Path probed</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Source (hashed)</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">User agent</th>
            </tr>
          </thead>
          <tbody>
            {data.recentHoneypotHits.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No honeypot hits yet.
                </td>
              </tr>
            )}
            {data.recentHoneypotHits.map((hit) => (
              <tr key={hit.id} className="border-t border-border/50">
                <td className="whitespace-nowrap px-4 py-2 text-foreground/80">
                  {new Date(hit.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 font-mono text-foreground/80">{hit.path}</td>
                <td className="px-4 py-2 font-mono text-foreground/80">{hit.ip_hash.slice(0, 16)}&hellip;</td>
                <td className="max-w-xs truncate px-4 py-2 text-foreground/80">{hit.user_agent || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <p className="border-b border-border p-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Failed /admin login attempts &mdash; 5 in 15 minutes from one source triggers a lockout
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Time</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Source (hashed)</th>
            </tr>
          </thead>
          <tbody>
            {data.recentFailedAttempts.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  No failed login attempts logged.
                </td>
              </tr>
            )}
            {data.recentFailedAttempts.map((attempt) => (
              <tr key={attempt.id} className="border-t border-border/50">
                <td className="whitespace-nowrap px-4 py-2 text-foreground/80">
                  {new Date(attempt.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 font-mono text-foreground/80">{attempt.ip_hash.slice(0, 16)}&hellip;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
