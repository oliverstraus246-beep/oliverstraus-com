import { csvDownloadHref, supabaseReadHeaders, toCsv } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

interface ContactRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  reason: string;
  ip_hash: string;
  user_agent: string | null;
}

async function getContacts(): Promise<ContactRow[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const res = await fetch(`${url}/rest/v1/contact_submissions?select=*&order=created_at.desc&limit=1000`, {
    headers: supabaseReadHeaders(key),
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as ContactRow[];
}

export default async function AdminContactsPage() {
  const contacts = await getContacts();

  if (contacts === null) {
    return (
      <>
        <h1 className="text-2xl font-bold">Contacts unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          Supabase env vars aren&apos;t configured on this environment.
        </p>
      </>
    );
  }

  const csvHref = csvDownloadHref(
    toCsv(
      contacts.map((c) => ({
        created_at: c.created_at,
        name: c.name,
        email: c.email,
        reason: c.reason,
        ip_hash: c.ip_hash,
      })),
    ),
  );

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight">Contact submissions</h1>
        <a
          href={csvHref}
          download="contact_submissions.csv"
          className="font-mono text-xs uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Download CSV
        </a>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {contacts.length} submission{contacts.length === 1 ? "" : "s"} total (most recent 1,000 shown).
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
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
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No submissions yet.
                </td>
              </tr>
            )}
            {contacts.map((c) => (
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
    </>
  );
}
