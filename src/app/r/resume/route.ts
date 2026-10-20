import { NextResponse, type NextRequest, after } from "next/server";
import { getClientIp, hashIp } from "@/lib/security";

// Tracked outbound-channel redirect for the résumé, e.g.
// oliverstraus.com/r/resume?src=linkedin in an email signature or a LinkedIn
// profile link. On-site résumé opens (the modal, the standalone /resume
// route) are already logged into page_views -- this exists only to answer
// "which off-site channel actually drives résumé opens," which page_views
// can't: it only sees the request after the redirect lands on /resume, with
// no memory of which shared link sent it there. `src` is whatever tag the
// link was created with; not validated against a fixed list since Oliver is
// the only one who ever creates these links.
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src")?.trim().slice(0, 100) || null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const ip_hash = await hashIp(getClientIp(request));
    // Logging must never delay or break the redirect -- scheduled for after
    // the response is sent, same pattern as src/app/api/download/[project]/route.ts.
    after(async () => {
      await fetch(`${url}/rest/v1/resume_redirect_clicks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          src,
          ip_hash,
          user_agent: request.headers.get("user-agent") ?? null,
        }),
      }).catch(() => {});
    });
  }

  return NextResponse.redirect(new URL("/resume", request.url), { status: 302 });
}
