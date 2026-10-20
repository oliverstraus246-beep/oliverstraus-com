"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Visitors and Downloads are grouped first -- they're the two halves of
// "who's showing up and what are they doing," including the résumé section
// now embedded in Visitors -- ahead of Contacts and Security, which are
// their own separate concerns (inbound messages; abuse/intrusion).
const ADMIN_LINKS = [
  { href: "/admin/stats", label: "Visitors" },
  { href: "/admin/downloads", label: "Downloads" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/security", label: "Security" },
] as const;

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <>
      {ADMIN_LINKS.map((link) => {
        // startsWith, not ===: /admin/stats/visitor/[hash] should still
        // highlight "Stats" as the active section it's nested under.
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "text-sm font-semibold text-accent-blue"
                : "text-sm text-foreground/80 transition-colors hover:text-accent-blue"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
