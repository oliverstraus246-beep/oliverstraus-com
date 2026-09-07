import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminNavLinks } from "@/app/admin/admin-nav-links";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Applies to every page under /admin, including /admin/login -- proxy.ts is
// the actual gate (signed session cookie, see src/lib/session.ts); this is
// just the shared shell plus a belt-and-suspenders noindex on top of
// robots.txt. Checks the same cookie itself (cheap: local HMAC verify, no
// DB call) purely to decide whether to render the authenticated nav --
// showing "Stats / Contacts / Security / Log out" on the login page itself
// would be confusing since none of those are reachable yet.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* pt-20/24: the site's <header> is position:fixed, height 75px, z-50 --
          every other page clears it with top padding on its own main content
          (e.g. resume/page.tsx's pt-28, work/page.tsx's pt-32). Without it,
          this nav starts at y=0 and renders completely hidden behind the
          fixed header instead of below it. */}
      <nav className="border-b border-border pt-28 sm:pt-32">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <Link
            href="/admin"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
          >
            Admin
          </Link>
          {authenticated && (
            <>
              <AdminNavLinks />
              <form action={logoutAdmin} className="ml-auto">
                <button
                  type="submit"
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
                >
                  Log out
                </button>
              </form>
            </>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>
    </div>
  );
}
