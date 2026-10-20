import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp, hashIp, isIpBlocked } from "@/lib/security";

// Self-hosted visitor pixel: VisitTracker (components/visit-tracker.tsx)
// beacons here twice per page view -- once on load (a "view" insert) and
// once on tab-hide/pagehide (a "duration" update to the same row, matched
// by the client-generated viewId) -- plus once on every route change. No
// third-party analytics SaaS -- data lands in Supabase's page_views table
// (see supabase/schema.sql), readable from the Supabase Table Editor, SQL,
// or /admin/stats.
const ViewSchema = z.object({
  type: z.literal("view"),
  viewId: z.string().uuid(),
  path: z.string().trim().min(1).max(2048),
  // document.referrer from the client -- empty for direct/bookmark/typed
  // navigation, the external site's URL when arriving from a link. Distinct
  // from this request's own Referer header, which would just be
  // oliverstraus.com itself (the page that sent the beacon).
  referrer: z.string().trim().max(2048).optional().default(""),
  viewportWidth: z.number().int().positive().max(20000).optional(),
  viewportHeight: z.number().int().positive().max(20000).optional(),
  language: z.string().trim().max(35).optional(),
  // Persistent first-party identifier from src/lib/visitor-id.ts (localStorage,
  // not a cookie). Optional: absent for older clients, private browsing, or
  // blocked storage -- those page views just can't be cross-IP-correlated.
  visitorId: z.string().uuid().optional(),
  // Browser-reported IANA timezone -- a free cross-check against the
  // IP-derived country/region below.
  timezone: z.string().trim().max(60).optional(),
  // ?utm_source/utm_medium/utm_campaign off the landing page's own URL.
  utmSource: z.string().trim().max(100).optional(),
  utmMedium: z.string().trim().max(100).optional(),
  utmCampaign: z.string().trim().max(100).optional(),
});

const DurationSchema = z.object({
  type: z.literal("duration"),
  viewId: z.string().uuid(),
  // Capped at 24h -- a stray tab left open for days shouldn't skew "average
  // time on page" into meaninglessness.
  durationMs: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 60 * 60 * 1000),
  // How far down the page/modal the visitor scrolled, 0-100 -- see
  // src/lib/scroll-depth.ts. Optional: older clients just don't send it.
  maxScrollPct: z.number().int().min(0).max(100).optional(),
});

function supabaseHeaders(key: string) {
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: "return=minimal",
  };
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Not configured yet, or Supabase unreachable -- a dropped page view must
  // never surface as an error to the visitor's browser.
  if (!url || !key) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const duration = DurationSchema.safeParse(body);
  if (duration.success) {
    try {
      await fetch(`${url}/rest/v1/page_views?view_id=eq.${duration.data.viewId}`, {
        method: "PATCH",
        headers: supabaseHeaders(key),
        body: JSON.stringify({
          duration_ms: duration.data.durationMs,
          ...(duration.data.maxScrollPct != null ? { max_scroll_pct: duration.data.maxScrollPct } : {}),
        }),
      });
    } catch {
      // A logging failure must never break the (invisible) beacon response.
    }
    return new NextResponse(null, { status: 204 });
  }

  const view = ViewSchema.safeParse(body);
  if (!view.success) return new NextResponse(null, { status: 204 });

  const clientIp = getClientIp(request);
  const ip_hash = await hashIp(clientIp);
  // Blocked visitors get the same silent 204 a real beacon gets -- their
  // page view just never lands, no signal back that they've been singled
  // out. The duration beacon above already no-ops harmlessly against a
  // view_id that was never written.
  if (await isIpBlocked(ip_hash)) return new NextResponse(null, { status: 204 });

  try {
    await fetch(`${url}/rest/v1/page_views`, {
      method: "POST",
      headers: supabaseHeaders(key),
      body: JSON.stringify({
        view_id: view.data.viewId,
        path: view.data.path,
        referrer: view.data.referrer || null,
        ip_hash,
        ip_address: clientIp === "unknown" ? null : clientIp,
        user_agent: request.headers.get("user-agent") ?? null,
        viewport_width: view.data.viewportWidth ?? null,
        viewport_height: view.data.viewportHeight ?? null,
        language: view.data.language ?? null,
        visitor_id: view.data.visitorId ?? null,
        timezone: view.data.timezone ?? null,
        utm_source: view.data.utmSource ?? null,
        utm_medium: view.data.utmMedium ?? null,
        utm_campaign: view.data.utmCampaign ?? null,
        // Populated by Vercel's edge network on every request that reaches
        // this function, on both Edge and Node runtimes -- absent entirely
        // in local dev, which is expected (no edge network in front of
        // `next dev`), so a null geo column locally isn't a bug.
        country: request.headers.get("x-vercel-ip-country") ?? null,
        region: request.headers.get("x-vercel-ip-country-region") ?? null,
        city: request.headers.get("x-vercel-ip-city") ?? null,
      }),
    });
  } catch {
    // A logging failure must never break the (invisible) beacon response.
  }

  return new NextResponse(null, { status: 204 });
}
