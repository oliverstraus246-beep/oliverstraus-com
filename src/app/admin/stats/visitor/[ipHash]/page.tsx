import { notFound } from "next/navigation";
import { blockIp, setVisitorNote, unblockIp } from "@/app/admin/actions";
import {
  countBy,
  deviceType,
  formatDuration,
  parseBrowser,
  parseOS,
  referrerLabel,
  supabaseReadHeaders,
} from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

interface PageViewRow {
  id: string;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  language: string | null;
  duration_ms: number | null;
  created_at: string;
  ip_address: string | null;
}

interface ContactRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  reason: string;
}

interface HoneypotRow {
  id: string;
  created_at: string;
  path: string;
}

interface AdminAttemptRow {
  id: string;
  created_at: string;
  success: boolean;
}

// A single ip_hash always corresponds to exactly one real IP (the hash is
// deterministic over the IP + salt), so unlike everything else on this page
// there's nothing to "group" -- one profile is the complete picture of every
// interaction this IP has ever had with the site, across all four tables
// that key on ip_hash.
async function getVisitorProfile(ipHash: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const headers = supabaseReadHeaders(key);
  const [viewsRes, contactsRes, honeypotRes, attemptsRes, blockedRes, noteRes] = await Promise.all([
    fetch(
      `${url}/rest/v1/page_views?ip_hash=eq.${ipHash}&select=id,path,referrer,user_agent,country,region,city,viewport_width,viewport_height,language,duration_ms,created_at,ip_address&order=created_at.desc&limit=5000`,
      { headers, cache: "no-store" },
    ),
    fetch(
      `${url}/rest/v1/contact_submissions?ip_hash=eq.${ipHash}&select=id,created_at,name,email,reason&order=created_at.desc`,
      { headers, cache: "no-store" },
    ),
    fetch(`${url}/rest/v1/honeypot_hits?ip_hash=eq.${ipHash}&select=id,created_at,path&order=created_at.desc`, {
      headers,
      cache: "no-store",
    }),
    fetch(
      `${url}/rest/v1/admin_auth_attempts?ip_hash=eq.${ipHash}&select=id,created_at,success&order=created_at.desc`,
      { headers, cache: "no-store" },
    ),
    fetch(`${url}/rest/v1/blocked_ips?ip_hash=eq.${ipHash}&select=reason,created_at`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${url}/rest/v1/visitor_notes?ip_hash=eq.${ipHash}&select=note`, { headers, cache: "no-store" }),
  ]);

  const views = viewsRes.ok ? ((await viewsRes.json()) as PageViewRow[]) : [];
  const contacts = contactsRes.ok ? ((await contactsRes.json()) as ContactRow[]) : [];
  const honeypotHits = honeypotRes.ok ? ((await honeypotRes.json()) as HoneypotRow[]) : [];
  const adminAttempts = attemptsRes.ok ? ((await attemptsRes.json()) as AdminAttemptRow[]) : [];
  const blockedRows = blockedRes.ok ? ((await blockedRes.json()) as { reason: string | null; created_at: string }[]) : [];
  const noteRows = noteRes.ok ? ((await noteRes.json()) as { note: string }[]) : [];

  if (views.length === 0 && contacts.length === 0 && honeypotHits.length === 0 && adminAttempts.length === 0) {
    return "not_found" as const;
  }

  const allTimestamps = [
    ...views.map((v) => v.created_at),
    ...contacts.map((c) => c.created_at),
    ...honeypotHits.map((h) => h.created_at),
    ...adminAttempts.map((a) => a.created_at),
  ].sort();
  const firstSeen = allTimestamps[0] ?? null;
  const lastSeen = allTimestamps[allTimestamps.length - 1] ?? null;

  const ipAddress = views.find((v) => v.ip_address)?.ip_address ?? null;
  const latest = views[0];
  const location = latest
    ? [latest.city, latest.region, latest.country].filter(Boolean).join(", ") || "Unknown"
    : "Unknown";

  const now = Date.now();
  const active =
    views.length > 0 && views[0]!.duration_ms == null && now - new Date(views[0]!.created_at).getTime() < 5 * 60_000;

  const durations = views.map((v) => v.duration_ms).filter((d): d is number => d != null && d > 0);
  const totalTimeMs = durations.reduce((sum, d) => sum + d, 0);
  const avgDurationMs = durations.length ? Math.round(totalTimeMs / durations.length) : null;

  // A unified chronological feed across all four tables -- "everything this
  // IP has ever done here," not four separate lists the reader has to
  // mentally interleave by timestamp themselves.
  type TimelineEntry = { time: string; kind: string; detail: string };
  const timeline: TimelineEntry[] = [
    ...views.map((v) => ({
      time: v.created_at,
      kind: "Page view",
      detail: `${v.path}${v.duration_ms ? ` (${formatDuration(v.duration_ms)})` : ""}${v.referrer ? ` via ${referrerLabel(v.referrer)}` : ""}`,
    })),
    ...contacts.map((c) => ({ time: c.created_at, kind: "Contact form", detail: `"${c.reason}" (${c.email})` })),
    ...honeypotHits.map((h) => ({ time: h.created_at, kind: "Honeypot hit", detail: `Probed ${h.path}` })),
    ...adminAttempts.map((a) => ({
      time: a.created_at,
      kind: "Admin login attempt",
      detail: a.success ? "Succeeded" : "Failed",
    })),
  ].sort((a, b) => (a.time < b.time ? 1 : -1));

  // Daily visit counts for the sparkline -- last 30 days, or fewer if the
  // visitor's history is shorter than that.
  const DAYS = 30;
  const dailyCounts: number[] = new Array(DAYS).fill(0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  for (const v of views) {
    const daysAgo = Math.floor((todayStart.getTime() - new Date(v.created_at).setHours(0, 0, 0, 0)) / 86_400_000);
    if (daysAgo >= 0 && daysAgo < DAYS) dailyCounts[DAYS - 1 - daysAgo]!++;
  }

  return {
    ipHash,
    ipAddress,
    location,
    active,
    firstSeen,
    lastSeen,
    visitCount: views.length,
    totalTimeMs,
    avgDurationMs,
    topPaths: countBy(views.map((v) => v.path), "(unknown)"),
    topReferrers: countBy(views.map((v) => referrerLabel(v.referrer)), "Direct / no referrer"),
    browsers: countBy(views.map((v) => (v.user_agent ? parseBrowser(v.user_agent) : null)), "Unknown"),
    operatingSystems: countBy(views.map((v) => (v.user_agent ? parseOS(v.user_agent) : null)), "Unknown"),
    deviceTypes: countBy(views.map((v) => deviceType(v.viewport_width, v.user_agent)), "Unknown"),
    languages: countBy(views.map((v) => v.language), "Unknown"),
    contacts,
    honeypotHitCount: honeypotHits.length,
    adminAttempts: { total: adminAttempts.length, successes: adminAttempts.filter((a) => a.success).length },
    blocked: blockedRows.length > 0 ? blockedRows[0]! : null,
    timeline,
    note: noteRows[0]?.note ?? "",
    dailyCounts,
  };
}

function Sparkline({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);
  const barWidth = 100 / counts.length;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full">
      {counts.map((count, i) => {
        const height = (count / max) * 28;
        return (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.15}
            y={32 - height}
            width={barWidth * 0.7}
            height={Math.max(height, count > 0 ? 1.5 : 0)}
            className={count > 0 ? "fill-accent-blue" : "fill-border"}
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function Badge({ tone, children }: { tone: "danger" | "warn" | "ok" | "neutral"; children: React.ReactNode }) {
  const toneClass = {
    danger: "border-red-400/40 text-red-400",
    warn: "border-amber-400/40 text-amber-400",
    ok: "border-emerald-400/40 text-emerald-400",
    neutral: "border-border text-muted-foreground",
  }[tone];
  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest ${toneClass}`}>
      {children}
    </span>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="mt-3 space-y-1.5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
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

interface PageProps {
  params: Promise<{ ipHash: string }>;
}

export default async function VisitorProfilePage({ params }: PageProps) {
  const { ipHash } = await params;
  const profile = await getVisitorProfile(ipHash);

  if (!profile) {
    return (
      <>
        <h1 className="text-2xl font-bold">Profile unavailable</h1>
        <p className="mt-2 text-muted-foreground">Supabase env vars aren&apos;t configured on this environment.</p>
      </>
    );
  }
  if (profile === "not_found") notFound();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Visitor profile</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{profile.ipAddress ?? "IP unknown"}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{profile.ipHash}</p>
        </div>
        <form action={profile.blocked ? unblockIp : blockIp}>
          <input type="hidden" name="ipHash" value={profile.ipHash} />
          {!profile.blocked && <input type="hidden" name="reason" value="Blocked from visitor profile" />}
          <button
            type="submit"
            className={
              profile.blocked
                ? "font-mono text-xs uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
                : "font-mono text-xs uppercase tracking-widest text-red-400 transition-colors hover:text-red-300"
            }
          >
            {profile.blocked ? "Unblock this visitor" : "Block this visitor"}
          </button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {profile.active && <Badge tone="ok">Active now</Badge>}
        <Badge tone={profile.visitCount > 1 ? "ok" : "neutral"}>
          {profile.visitCount > 1 ? "Returning visitor" : "First-time visitor"}
        </Badge>
        {profile.blocked && <Badge tone="danger">Blocked{profile.blocked.reason ? `: ${profile.blocked.reason}` : ""}</Badge>}
        {profile.honeypotHitCount > 0 && (
          <Badge tone="warn">Scanner &mdash; {profile.honeypotHitCount} honeypot hit{profile.honeypotHitCount === 1 ? "" : "s"}</Badge>
        )}
        {profile.adminAttempts.total > 0 && (
          <Badge tone={profile.adminAttempts.successes > 0 ? "ok" : "danger"}>
            {profile.adminAttempts.successes > 0 ? "Logged into admin" : "Tried admin login"} &mdash;{" "}
            {profile.adminAttempts.total} attempt{profile.adminAttempts.total === 1 ? "" : "s"}
          </Badge>
        )}
        {profile.contacts.length > 0 && <Badge tone="ok">Contacted you &mdash; {profile.contacts.length}</Badge>}
        <Badge tone="neutral">{profile.location}</Badge>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Activity, last 30 days
        </p>
        <div className="mt-2">
          <Sparkline counts={profile.dailyCounts} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Your note on this visitor
        </p>
        <form action={setVisitorNote} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
          <input type="hidden" name="ipHash" value={profile.ipHash} />
          <textarea
            name="note"
            defaultValue={profile.note}
            rows={2}
            placeholder="E.g. 'my friend Jake', 'recruiter from X', 'possible client'..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-blue focus:outline-none"
          />
          <button
            type="submit"
            className="font-mono text-xs uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
          >
            Save
          </button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Page views" value={profile.visitCount.toLocaleString()} />
        <StatCard label="Total time on site" value={profile.totalTimeMs ? formatDuration(profile.totalTimeMs) : "—"} />
        <StatCard label="Avg. time/page" value={profile.avgDurationMs ? formatDuration(profile.avgDurationMs) : "—"} />
        <StatCard label="First seen" value={profile.firstSeen ? new Date(profile.firstSeen).toLocaleDateString() : "—"} />
        <StatCard label="Last seen" value={profile.lastSeen ? new Date(profile.lastSeen).toLocaleString() : "—"} />
        <StatCard label="Honeypot hits" value={profile.honeypotHitCount} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BreakdownTable title="Pages visited" rows={profile.topPaths} />
        <BreakdownTable title="Referrers" rows={profile.topReferrers} />
        <BreakdownTable title="Browsers" rows={profile.browsers} />
        <BreakdownTable title="Operating systems" rows={profile.operatingSystems} />
        <BreakdownTable title="Device types" rows={profile.deviceTypes} />
        <BreakdownTable title="Languages" rows={profile.languages} />
      </div>

      {profile.contacts.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
          <p className="border-b border-border p-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Contact form submissions from this IP
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Time</th>
                <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Name</th>
                <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Email</th>
                <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Message</th>
              </tr>
            </thead>
            <tbody>
              {profile.contacts.map((c) => (
                <tr key={c.id} className="border-t border-border/50 align-top">
                  <td className="whitespace-nowrap px-4 py-2 text-foreground/80">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-foreground/80">{c.name}</td>
                  <td className="px-4 py-2 text-foreground/80">
                    <a href={`mailto:${c.email}`} className="hover:text-accent-blue">
                      {c.email}
                    </a>
                  </td>
                  <td className="max-w-md px-4 py-2 text-foreground/80">{c.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <p className="border-b border-border p-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Full activity timeline ({profile.timeline.length} events)
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Time</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Event</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Detail</th>
            </tr>
          </thead>
          <tbody>
            {profile.timeline.map((entry, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="whitespace-nowrap px-4 py-2 text-foreground/80">
                  {new Date(entry.time).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-foreground/80">{entry.kind}</td>
                <td className="px-4 py-2 text-foreground/80">{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
