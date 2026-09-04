import type { Metadata } from "next";
import Link from "next/link";

// Applies to every page under /admin -- proxy.ts is the actual gate (Basic
// Auth + failed-attempt lockout); this is just the shared shell (nav +
// container) plus a belt-and-suspenders noindex on top of robots.txt.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const ADMIN_LINKS = [
  { href: "/admin/stats", label: "Stats" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/security", label: "Security" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-foreground/80 transition-colors hover:text-accent-blue"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>
    </div>
  );
}
