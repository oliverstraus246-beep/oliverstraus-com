import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp, hashIp } from "@/lib/security";

// Beacon target for the résumé's "Download PDF" buttons (resume-print-button.tsx
// and the inline button in resume-modal.tsx). Printing itself is pure
// client-side window.print() -- there's no file for a server route to serve
// or redirect to -- so this is the only way a résumé "download" ever touches
// the server at all. Logs into the same download_events table the real
// project releases use (src/app/api/download/[project]/route.ts), with
// project="resume" and platform="pdf" so it shows up in /admin/downloads for
// free. ip_hash only, never a raw IP -- same posture as every other
// download_events row (see supabase/schema.sql's comment on that table).
const BodySchema = z.object({
  preset: z.string().trim().min(1).max(50),
});

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" };
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Printing must never depend on this -- a dropped log is invisible to the visitor.
  if (!url || !key) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const ip_hash = await hashIp(getClientIp(request));

  try {
    await fetch(`${url}/rest/v1/download_events`, {
      method: "POST",
      headers: supabaseHeaders(key),
      body: JSON.stringify({
        project: "resume",
        platform: "pdf",
        version: parsed.data.preset,
        ip_hash,
        user_agent: request.headers.get("user-agent") ?? null,
      }),
    });
  } catch {
    // A logging failure must never break the download.
  }

  return new NextResponse(null, { status: 204 });
}
