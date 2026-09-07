"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  { href: "/admin/stats", label: "Stats" },
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
