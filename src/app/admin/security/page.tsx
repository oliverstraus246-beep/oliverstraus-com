import Link from "next/link";
import { blockIp, purgeOldHoneypotHits, unblockIp } from "@/app/admin/actions";
import {
  countBy,
  csvDownloadHref,
  detectSpikes,
  SPIKE_THRESHOLD_PER_MINUTE,
  supabaseReadHeaders,
  toCsv,
  type Spike,
  type SpikeEvent,
} from "@/lib/admin-stats";

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

interface BlockedIpRow {
  ip_hash: string;
  reason: string | null;
  created_at: string;
}

async function getSecurityData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const headers = supabaseReadHeaders(key);
  const [honeypotCountRes, honeypotRowsRes, attemptRowsRes, blockedRowsRes, pageViewEventsRes, contactEventsRes] =
    await Promise.all([
      fetch(`${url}/rest/v1/honeypot_hits?select=id`, {
        method: "HEAD",
        headers: { ...headers, Prefer: "count=exact" },
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/honeypot_hits?select=*&order=created_at.desc&limit=2000`, {
        headers,
        cache: "no-store",
      }),
      // admin_auth_attempts / blocked_ips may not exist yet on a database
      // that hasn't run the latest migration -- treated as "no data" rather
      // than an error.
      fetch(`${url}/rest/v1/admin_auth_attempts?select=*&order=created_at.desc&limit=500`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/blocked_ips?select=*&order=created_at.desc`, { headers, cache: "no-store" }),
      fetch(`${url}/rest/v1/page_views?select=ip_hash,created_at&order=created_at.desc&limit=5000`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/contact_submissions?select=ip_hash,created_at&order=created_at.desc&limit=1000`, {
        headers,
        cache: "no-store",
      }),
    ]);

  const totalHoneypotHits = Number(honeypotCountRes.headers.get("content-range")?.split("/")[1] ?? 0);
  const honeypotHits = honeypotRowsRes.ok ? ((await honeypotRowsRes.json()) as HoneypotRow[]) : [];
  const adminAttempts = attemptRowsRes.ok ? ((await attemptRowsRes.json()) as AdminAttemptRow[]) : [];
  const blockedIps = blockedRowsRes.ok ? ((await blockedRowsRes.json()) as BlockedIpRow[]) : [];
  const blockedSet = new Set(blockedIps.map((b) => b.ip_hash));
  const pageViewEvents = pageViewEventsRes.ok
    ? ((await pageViewEventsRes.json()) as { ip_hash: string; created_at: string }[])
    : [];
  const contactEvents = contactEventsRes.ok
    ? ((await contactEventsRes.json()) as { ip_hash: string; created_at: string }[])
    : [];

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const honeypotLast24h = honeypotHits.filter((r) => now - new Date(r.created_at).getTime() < DAY_MS).length;

  const failedAdminAttempts = adminAttempts.filter((a) => !a.success);
  const failedLast24h = failedAdminAttempts.filter((a) => now - new Date(a.created_at).getTime() < DAY_MS).length;
  const successfulAdminAttempts = adminAttempts.filter((a) => a.success);

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

  // countBy collapses to the label it's given -- pass the full hash so the
  // "block" button on each top-scanner row has something real to act on,
  // truncate only at render time.
  const topScannedPaths = countBy(honeypotHits.map((h) => h.path), "(unknown)");
  const topScannerIps = countBy(honeypotHits.map((h) => h.ip_hash), "(unknown)");

  const spikeEvents: SpikeEvent[] = [
    ...pageViewEvents.map((e) => ({ ipHash: e.ip_hash, timestamp: e.created_at })),
    ...honeypotHits.map((e) => ({ ipHash: e.ip_hash, timestamp: e.created_at })),
    ...contactEvents.map((e) => ({ ipHash: e.ip_hash, timestamp: e.created_at })),
  ];
  const spikes = detectSpikes(spikeEvents, blockedSet);

  return {
    totalHoneypotHits,
    sampleSize: honeypotHits.length,
    honeypotLast24h,
    topScannedPaths,
    topScannerIps,
    recentHoneypotHits: honeypotHits.slice(0, 50),
    csvHref,
    failedAdminAttempts: failedAdminAttempts.length,
    failedLast24h,
    recentAdminAttempts: adminAttempts.slice(0, 30),
    successfulAdminAttemptsCount: successfulAdminAttempts.length,
    blockedIps,
    blockedSet,
    spikes,
  };
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4" title={hint}>
      <p className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
        {hint && <span className="cursor-help text-muted-foreground/60">&#9432;</span>}
      </p>
      <p className="mt-1 text-3xl font-black tracking-tight text-foreground">{value}</p>
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
      <input type="hidden" name="reason" value="Blocked from /admin/security" />
      <button
        type="submit"
        className="font-mono text-[11px] uppercase tracking-widest text-red-400 transition-colors hover:text-red-300"
      >
        Block
      </button>
    </form>
  );
}

function ProfileLink({ ipHash }: { ipHash: string }) {
  return (
    <Link
      href={`/admin/stats/visitor/${ipHash}`}
      className="font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
    >
      Profile
    </Link>
  );
}

function SpikeTable({ spikes }: { spikes: Spike[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Traffic anomalies ({spikes.length}) &mdash; {SPIKE_THRESHOLD_PER_MINUTE}+ requests in a single minute
          from one source
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This detects abnormal bursts within what this app itself logs (page views, honeypot probes, contact
          submissions) -- it can&apos;t see a true network-layer flood, which Vercel&apos;s own edge absorbs
          before a request ever reaches this code.
        </p>
      </div>
      {spikes.length === 0 && <p className="p-4 text-sm text-muted-foreground">No anomalies detected.</p>}
      {spikes.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest" title="A salted one-way hash of the IP -- open a profile to see the real address, ISP, and full history.">Source (hashed)</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Peak rate</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Total events</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Status</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {spikes.map((s) => (
              <tr key={s.ipHash} className="border-t border-border/50">
                <td className="px-4 py-2 font-mono text-foreground/80">{s.ipHash.slice(0, 16)}&hellip;</td>
                <td className="px-4 py-2 text-foreground/80">{s.peakPerMinute}/min</td>
                <td className="px-4 py-2 text-foreground/80">{s.totalEvents}</td>
                <td className={s.blocked ? "px-4 py-2 text-emerald-400" : "px-4 py-2 text-red-400"}>
                  {s.blocked ? "Blocked" : "Not blocked"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <ProfileLink ipHash={s.ipHash} />
                    <BlockButton ipHash={s.ipHash} blocked={s.blocked} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ScannerIpTable({ rows, blockedSet }: { rows: [string, number][]; blockedSet: Set<string> }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p
        className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
        title="Sources ranked by honeypot hits. Shown hashed here for at-a-glance scanning -- open a profile to see the real IP, ISP, and full activity history."
      >
        Most active scanner IPs (hashed)
      </p>
      <div className="mt-3 space-y-1.5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        {rows.map(([ipHash, count]) => (
          <div key={ipHash} className="flex items-center justify-between gap-4 text-sm">
            <span className="truncate font-mono text-foreground/80">{ipHash.slice(0, 16)}&hellip;</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-foreground">{count}</span>
              <ProfileLink ipHash={ipHash} />
              <BlockButton ipHash={ipHash} blocked={blockedSet.has(ipHash)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownTable({ title, rows, hint }: { title: string; rows: [string, number][]; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground" title={hint}>
        {title}
      </p>
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

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard
          label="Honeypot hits (all-time)"
          value={data.totalHoneypotHits.toLocaleString()}
          hint="Requests to fake sensitive-looking paths (/wp-admin, /.env, /.git/config, and similar) that nothing real is ever mounted at. A hit always means a scanner or bot -- never a real visitor."
        />
        <StatCard
          label="Last 24 hours"
          value={data.honeypotLast24h.toLocaleString()}
          hint="Honeypot hits in the last 24 hours."
        />
        <StatCard
          label="Failed admin logins (24h)"
          value={data.failedLast24h.toLocaleString()}
          hint="Wrong username, password, or authenticator code submitted at /admin/login in the last 24 hours. 5 failures within 15 minutes from the same source triggers a temporary lockout."
        />
        <StatCard
          label="Blocked IPs"
          value={data.blockedIps.length.toLocaleString()}
          hint="Sources on the manual blocklist. A blocked IP's page views, contact form submissions, and admin login attempts are silently dropped -- no error shown, no signal that they've been singled out."
        />
        <StatCard
          label="Traffic anomalies"
          value={data.spikes.length.toLocaleString()}
          hint={`Sources that hit ${SPIKE_THRESHOLD_PER_MINUTE}+ times in a single minute across page views, honeypot probes, or contact submissions -- faster than any human browsing, the shape a script or aggressive scanner takes.`}
        />
      </div>

      <SpikeTable spikes={data.spikes} />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BreakdownTable
          title="Most scanned paths"
          rows={data.topScannedPaths}
          hint="Which fake sensitive-looking paths get probed most. High counts on /wp-admin or /xmlrpc.php just mean automated WordPress scanners -- routine internet background noise, not a targeted attack."
        />
        <ScannerIpTable rows={data.topScannerIps} blockedSet={data.blockedSet} />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <p
            className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
            title="Sources on the manual blocklist -- their page views, contact submissions, and admin login attempts are silently dropped."
          >
            Blocked IPs ({data.blockedIps.length})
          </p>
        </div>
        {data.blockedIps.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            Nothing blocked. Use the Block button next to a scanner IP above or a visitor on /admin/stats.
          </p>
        )}
        {data.blockedIps.map((b) => (
          <div
            key={b.ip_hash}
            className="flex items-center justify-between gap-4 border-t border-border/50 px-4 py-2.5 text-sm first:border-t-0"
          >
            <span className="truncate font-mono text-foreground/80">{b.ip_hash.slice(0, 16)}&hellip;</span>
            <span className="flex-1 truncate text-foreground/60">{b.reason || "—"}</span>
            <span className="whitespace-nowrap text-muted-foreground">
              {new Date(b.created_at).toLocaleDateString()}
            </span>
            <ProfileLink ipHash={b.ip_hash} />
            <BlockButton ipHash={b.ip_hash} blocked={true} />
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <p
            className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
            title="Every request to a fake sensitive-looking path, newest first. These paths (/wp-admin, /.env, /.git/config, etc.) don't exist on this site -- nothing but a scanner or bot would ever request them."
          >
            Recent honeypot hits
          </p>
          <form action={purgeOldHoneypotHits}>
            <button
              type="submit"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Purge hits older than 90 days
            </button>
          </form>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Time</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Path probed</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest" title="A salted one-way hash of the IP -- open a profile to see the real address, ISP, and full history.">Source (hashed)</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">User agent</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.recentHoneypotHits.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
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
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <ProfileLink ipHash={hit.ip_hash} />
                    <BlockButton ipHash={hit.ip_hash} blocked={data.blockedSet.has(hit.ip_hash)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <p className="border-b border-border p-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Admin login history &mdash; {data.successfulAdminAttemptsCount} successful, {data.failedAdminAttempts}{" "}
          failed (sample). 5 failures in 15 minutes from one source triggers a lockout.
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Time</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest" title="A salted one-way hash of the IP -- open a profile to see the real address, ISP, and full history.">Source (hashed)</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Result</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.recentAdminAttempts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No login attempts logged yet.
                </td>
              </tr>
            )}
            {data.recentAdminAttempts.map((attempt) => (
              <tr key={attempt.id} className="border-t border-border/50">
                <td className="whitespace-nowrap px-4 py-2 text-foreground/80">
                  {new Date(attempt.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 font-mono text-foreground/80">{attempt.ip_hash.slice(0, 16)}&hellip;</td>
                <td className={attempt.success ? "px-4 py-2 text-emerald-400" : "px-4 py-2 text-red-400"}>
                  {attempt.success ? "Success" : "Failed"}
                </td>
                <td className="px-4 py-2">
                  <ProfileLink ipHash={attempt.ip_hash} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
