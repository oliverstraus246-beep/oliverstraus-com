import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp, hashIp } from "@/lib/security";

// Self-hosted visitor pixel: VisitTracker (components/visit-tracker.tsx)
// beacons here on every route change. No third-party analytics SaaS -- data
// lands in Supabase's page_views table (see supabase/schema.sql), readable
// later from the Supabase Table Editor or via SQL.
const TrackSchema = z.object({
  path: z.string().trim().min(1).max(2048),
  // document.referrer from the client -- empty for direct/bookmark/typed
  // navigation, the external site's URL when arriving from a link. Distinct
  // from this request's own Referer header, which would just be
  // oliverstraus.com itself (the page that sent the beacon).
  referrer: z.string().trim().max(2048).optional().default(""),
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

  const parsed = TrackSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const ip_hash = await hashIp(getClientIp(request));

  try {
    await fetch(`${url}/rest/v1/page_views`, {
      method: "POST",
      headers: supabaseHeaders(key),
      body: JSON.stringify({
        path: parsed.data.path,
        referrer: parsed.data.referrer || null,
        ip_hash,
        user_agent: request.headers.get("user-agent") ?? null,
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
