import Link from "next/link";
import { blockIp, unblockIp } from "@/app/admin/actions";
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

async function getContacts(query: string): Promise<{ contacts: ContactRow[]; blockedSet: Set<string> } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const searchQuery = query
    ? `&or=(name.ilike.*${encodeURIComponent(query)}*,email.ilike.*${encodeURIComponent(query)}*)`
    : "";

  const [contactsRes, blockedRes] = await Promise.all([
    fetch(`${url}/rest/v1/contact_submissions?select=*&order=created_at.desc&limit=1000${searchQuery}`, {
      headers: supabaseReadHeaders(key),
      cache: "no-store",
    }),
    fetch(`${url}/rest/v1/blocked_ips?select=ip_hash`, { headers: supabaseReadHeaders(key), cache: "no-store" }),
  ]);

  const contacts = contactsRes.ok ? ((await contactsRes.json()) as ContactRow[]) : [];
  const blockedSet = new Set(
    blockedRes.ok ? ((await blockedRes.json()) as { ip_hash: string }[]).map((b) => b.ip_hash) : [],
  );
  return { contacts, blockedSet };
}

function BlockButton({ ipHash, blocked }: { ipHash: string; blocked: boolean }) {
  if (blocked) {
    return (
      <form action={unblockIp}>
        <input type="hidden" name="ipHash" value={ipHash} />
        <button
          type="submit"
          className="font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Unblock
        </button>
      </form>
    );
  }
  return (
    <form action={blockIp}>
      <input type="hidden" name="ipHash" value={ipHash} />
      <input type="hidden" name="reason" value="Blocked from /admin/contacts" />
      <button
        type="submit"
        className="font-mono text-[11px] uppercase tracking-widest text-red-400 transition-colors hover:text-red-300"
      >
        Block sender
      </button>
    </form>
  );
}

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminContactsPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const data = await getContacts(q);

  if (!data) {
    return (
      <>
        <h1 className="text-2xl font-bold">Contacts unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          Supabase env vars aren&apos;t configured on this environment.
        </p>
      </>
    );
  }

  const { contacts, blockedSet } = data;
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
        {contacts.length} submission{contacts.length === 1 ? "" : "s"} {q ? "matching" : "total"} (most recent
        1,000 shown).
      </p>

      <form method="get" className="mt-4 flex items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-blue focus:outline-none"
        />
        <button
          type="submit"
          className="font-mono text-xs uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
        >
          Search
        </button>
        {q && (
          <a href="/admin/contacts" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Clear
          </a>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Time</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Name</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Email</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Message</th>
              <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No submissions {q ? "match that search." : "yet."}
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
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/stats/visitor/${c.ip_hash}`}
                      className="font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
                    >
                      Profile
                    </Link>
                    <BlockButton ipHash={c.ip_hash} blocked={blockedSet.has(c.ip_hash)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
