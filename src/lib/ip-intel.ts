// Network intelligence for a raw IP -- ISP/org/ASN, whether it's a known
// VPN/proxy, hosting/datacenter, or mobile carrier, and reverse DNS. This is
// the "who is this, really" layer on top of the geo (country/region/city)
// Vercel already gives us for free: a residential ISP name plus a real
// reverse-DNS hostname is a strong signal of an actual human, while a
// hosting/proxy flag or an AWS/DigitalOcean/etc. hostname is a strong signal
// of a bot or someone hiding behind a VPN.
//
// Backed by ip-api.com's free, no-API-key JSON endpoint (45 req/min from one
// server IP). Results are cached in the ip_intel table for 30 days so a
// visitor who reloads the site doesn't burn the rate limit on every page
// view -- profile pages are the only thing that ever calls this.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface IpIntel {
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  isProxy: boolean;
  isHosting: boolean;
  isMobile: boolean;
  reverseDns: string | null;
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("127.")) return true;
  if (/^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function rowToIntel(row: Record<string, unknown>): IpIntel {
  return {
    country: (row.country as string) ?? null,
    region: (row.region as string) ?? null,
    city: (row.city as string) ?? null,
    isp: (row.isp as string) ?? null,
    org: (row.org as string) ?? null,
    asn: (row.asn as string) ?? null,
    isProxy: Boolean(row.is_proxy),
    isHosting: Boolean(row.is_hosting),
    isMobile: Boolean(row.is_mobile),
    reverseDns: (row.reverse_dns as string) ?? null,
  };
}

export async function getIpIntel(ip: string | null): Promise<IpIntel | null> {
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const headers = supabaseHeaders(key);

  try {
    const cacheRes = await fetch(`${url}/rest/v1/ip_intel?ip_address=eq.${encodeURIComponent(ip)}&select=*`, {
      headers,
      cache: "no-store",
    });
    if (cacheRes.ok) {
      const rows = (await cacheRes.json()) as Record<string, unknown>[];
      const cached = rows[0];
      if (cached && Date.now() - new Date(cached.fetched_at as string).getTime() < CACHE_TTL_MS) {
        return rowToIntel(cached);
      }
    }
  } catch {
    // A cache-read failure just means we fall through to a live lookup.
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp,org,as,mobile,proxy,hosting,reverse`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      country?: string;
      regionName?: string;
      city?: string;
      isp?: string;
      org?: string;
      as?: string;
      mobile?: boolean;
      proxy?: boolean;
      hosting?: boolean;
      reverse?: string;
    };
    if (data.status !== "success") return null;

    const intel: IpIntel = {
      country: data.country ?? null,
      region: data.regionName ?? null,
      city: data.city ?? null,
      isp: data.isp ?? null,
      org: data.org ?? null,
      asn: data.as ?? null,
      isProxy: Boolean(data.proxy),
      isHosting: Boolean(data.hosting),
      isMobile: Boolean(data.mobile),
      reverseDns: data.reverse || null,
    };

    void fetch(`${url}/rest/v1/ip_intel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        ip_address: ip,
        country: intel.country,
        region: intel.region,
        city: intel.city,
        isp: intel.isp,
        org: intel.org,
        asn: intel.asn,
        is_proxy: intel.isProxy,
        is_hosting: intel.isHosting,
        is_mobile: intel.isMobile,
        reverse_dns: intel.reverseDns,
        fetched_at: new Date().toISOString(),
      }),
    });

    return intel;
  } catch {
    return null; // A lookup failure must never break the profile page.
  }
}
