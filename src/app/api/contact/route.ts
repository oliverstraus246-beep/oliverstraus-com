import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp, hashIp } from "@/lib/security";

const ContactSchema = z.object({
  email: z.string().trim().min(3).max(320).email(),
  name: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(1).max(1000),
  // Honeypot: a real visitor never fills this in. A bot filling every
  // field usually does. Must arrive empty.
  website: z.string().max(0, { message: "spam detected" }).optional().default(""),
});

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

function supabaseHeaders(key: string) {
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

// Fire-and-forget: an email provider outage must never fail the visitor's
// submission, which is already safely saved in Supabase by the time this
// runs. Uses Resend's REST API directly rather than pulling in their SDK
// for one call, matching how Supabase itself is called elsewhere in this
// route. Silently no-ops if RESEND_API_KEY isn't set yet.
async function notifyByEmail(submission: { email: string; name: string; reason: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFICATION_EMAIL;
  if (!resendKey || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Oliver Straus site <onboarding@resend.dev>",
        to: [to],
        reply_to: submission.email,
        subject: `New contact form message from ${submission.name}`,
        text: `From: ${submission.name} <${submission.email}>\n\n${submission.reason}`,
      }),
    });
  } catch {
    // Never let a notification failure surface to the visitor.
  }
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Not configured yet -- fail clearly rather than silently pretending
    // to succeed. See .env.local TODO(Oliver).
    return NextResponse.json(
      { error: "Contact form isn't wired up yet on the server side." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (parsed.data.website.length > 0) {
    // Honeypot tripped. Report success so the bot doesn't learn anything,
    // but never write it.
    return NextResponse.json({ ok: true });
  }

  const ip_hash = await hashIp(getClientIp(request));

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
  const rateCheck = await fetch(
    `${url}/rest/v1/contact_submissions?select=id&ip_hash=eq.${ip_hash}&created_at=gte.${since}`,
    { headers: supabaseHeaders(key) },
  );
  if (rateCheck.ok) {
    const rows = (await rateCheck.json()) as unknown[];
    if (rows.length >= RATE_LIMIT_MAX_SUBMISSIONS) {
      return NextResponse.json(
        { error: "Too many submissions. Try again later." },
        { status: 429 },
      );
    }
  }

  const { email, name, reason } = parsed.data;
  const insertRes = await fetch(`${url}/rest/v1/contact_submissions`, {
    method: "POST",
    headers: { ...supabaseHeaders(key), Prefer: "return=minimal" },
    body: JSON.stringify({
      email,
      name,
      reason,
      ip_hash,
      user_agent: request.headers.get("user-agent") ?? null,
    }),
  });

  if (!insertRes.ok) {
    return NextResponse.json({ error: "Failed to save submission." }, { status: 502 });
  }

  void notifyByEmail({ email, name, reason });

  return NextResponse.json({ ok: true });
}
