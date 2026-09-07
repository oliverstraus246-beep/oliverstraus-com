import Link from "next/link";
import { detectSpikes, supabaseReadHeaders, type SpikeEvent } from "@/lib/admin-stats";

// Never prerendered (auth-gated, needs live counts every time).
export const dynamic = "force-dynamic";

function exactCount(res: Response): number {
  return Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
}

async function getOverview() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const headCount = (table: string, extraQuery = "") =>
    fetch(`${url}/rest/v1/${table}?select=id${extraQuery}`, {
      method: "HEAD",
      headers: { ...supabaseReadHeaders(key), Prefer: "count=exact" },
      cache: "no-store",
    });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const [totalViews, contacts, blockedIps, honeypot24h, activeRes, blockedRes, recentViewsRes, recentHoneypotRes] =
    await Promise.all([
      headCount("page_views"),
      headCount("contact_submissions"),
      headCount("blocked_ips"),
      headCount("honeypot_hits", `&created_at=gte.${dayAgo}`),
      fetch(`${url}/rest/v1/page_views?select=ip_hash&duration_ms=is.null&created_at=gte.${fiveMinAgo}`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/blocked_ips?select=ip_hash`, { headers: supabaseReadHeaders(key), cache: "no-store" }),
      fetch(`${url}/rest/v1/page_views?select=ip_hash,created_at&order=created_at.desc&limit=5000`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/honeypot_hits?select=ip_hash,created_at&order=created_at.desc&limit=2000`, {
        headers: supabaseReadHeaders(key),
        cache: "no-store",
      }),
    ]);

  const activeRows = activeRes.ok ? ((await activeRes.json()) as { ip_hash: string }[]) : [];
  const activeNow = new Set(activeRows.map((r) => r.ip_hash)).size;

  const blockedSet = new Set(
    blockedRes.ok ? ((await blockedRes.json()) as { ip_hash: string }[]).map((b) => b.ip_hash) : [],
  );
  const recentViews = recentViewsRes.ok ? ((await recentViewsRes.json()) as { ip_hash: string; created_at: string }[]) : [];
  const recentHoneypot = recentHoneypotRes.ok
    ? ((await recentHoneypotRes.json()) as { ip_hash: string; created_at: string }[])
    : [];
  const spikeEvents: SpikeEvent[] = [
    ...recentViews.map((v) => ({ ipHash: v.ip_hash, timestamp: v.created_at })),
    ...recentHoneypot.map((h) => ({ ipHash: h.ip_hash, timestamp: h.created_at })),
  ];
  const anomalies = detectSpikes(spikeEvents, blockedSet).length;

  return {
    totalViews: exactCount(totalViews),
    contacts: exactCount(contacts),
    blockedIps: exactCount(blockedIps),
    honeypot24h: exactCount(honeypot24h),
    activeNow,
    anomalies,
  };
}

function OverviewStat({ label, value, live }: { label: string; value: string | number; live?: boolean }) {
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

function ToolCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent-blue/50"
    >
      <p className="text-lg font-bold text-foreground transition-colors group-hover:text-accent-blue">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <span className="mt-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-accent-blue">
        Open
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </span>
    </Link>
  );
}

export default async function AdminHomePage() {
  const overview = await getOverview();

  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Everything about who visits, who reaches out, and who&apos;s probing the site.
      </p>

      {overview && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <OverviewStat label="Active now" value={overview.activeNow} live={overview.activeNow > 0} />
          <OverviewStat label="Total views" value={overview.totalViews.toLocaleString()} />
          <OverviewStat label="Contact submissions" value={overview.contacts.toLocaleString()} />
          <OverviewStat label="Honeypot hits (24h)" value={overview.honeypot24h.toLocaleString()} />
          <OverviewStat label="Blocked IPs" value={overview.blockedIps.toLocaleString()} />
          <OverviewStat label="Traffic anomalies" value={overview.anomalies.toLocaleString()} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ToolCard
          href="/admin/stats"
          title="Stats"
          description="Traffic, engagement time, browsers/OS/devices, and per-visitor drill-down."
        />
        <ToolCard
          href="/admin/contacts"
          title="Contacts"
          description="Every contact form submission, searchable, with CSV export."
        />
        <ToolCard
          href="/admin/security"
          title="Security"
          description="Bot/scanner activity, admin login history, and the IP blocklist."
        />
      </div>
    </>
  );
}
