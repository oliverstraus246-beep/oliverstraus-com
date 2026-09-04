import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp, hashIp } from "@/lib/security";

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
        body: JSON.stringify({ duration_ms: duration.data.durationMs }),
      });
    } catch {
      // A logging failure must never break the (invisible) beacon response.
    }
    return new NextResponse(null, { status: 204 });
  }

  const view = ViewSchema.safeParse(body);
  if (!view.success) return new NextResponse(null, { status: 204 });

  const ip_hash = await hashIp(getClientIp(request));

  try {
    await fetch(`${url}/rest/v1/page_views`, {
      method: "POST",
      headers: supabaseHeaders(key),
      body: JSON.stringify({
        view_id: view.data.viewId,
        path: view.data.path,
        referrer: view.data.referrer || null,
        ip_hash,
        user_agent: request.headers.get("user-agent") ?? null,
        viewport_width: view.data.viewportWidth ?? null,
        viewport_height: view.data.viewportHeight ?? null,
        language: view.data.language ?? null,
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
