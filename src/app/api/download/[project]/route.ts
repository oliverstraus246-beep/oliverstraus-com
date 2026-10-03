import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, hashIp } from "@/lib/security";
import { isPlatform, pickCurrentRelease, type DownloadReleaseRow } from "@/lib/downloads";

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ project: string }> },
) {
  const { project } = await params;
  const platform = request.nextUrl.searchParams.get("platform");

  if (!isPlatform(platform)) {
    return new NextResponse("Unknown platform. Use ?platform=mac|linux|windows.", { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return new NextResponse("Downloads aren't configured yet.", { status: 503 });
  }

  const releaseRes = await fetch(
    `${url}/rest/v1/download_releases?select=*&project=eq.${encodeURIComponent(project)}&platform=eq.${platform}&is_current=eq.true`,
    { headers: supabaseHeaders(key), cache: "no-store" },
  );
  const rows = releaseRes.ok ? ((await releaseRes.json()) as DownloadReleaseRow[]) : [];
  const release = pickCurrentRelease(rows, project, platform);

  if (!release) {
    return new NextResponse("Nothing published for this platform yet.", { status: 404 });
  }

  const ip_hash = await hashIp(getClientIp(request));
  // Fire-and-forget: logging must never block or break the actual download,
  // same rule proxy.ts's honeypot logger follows. Unlike that logger, there's
  // no ordering-sensitive counter reading this table, so it isn't awaited.
  void fetch(`${url}/rest/v1/download_events`, {
    method: "POST",
    headers: { ...supabaseHeaders(key), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      project,
      platform,
      version: release.version,
      ip_hash,
      user_agent: request.headers.get("user-agent") ?? null,
    }),
  }).catch(() => {});

  return NextResponse.redirect(release.blob_url, { status: 302 });
}
