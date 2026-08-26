"use client";

import { SocialLinks } from "@/components/social-links";
import { openResume } from "@/components/resume-modal";

const NAVIGATION = [
  { href: "#work", label: "Work", isResume: false },
  { href: "#about", label: "About", isResume: false },
  { href: "/resume", label: "Resume", isResume: true },
  { href: "#contact", label: "Contact", isResume: false },
] as const;

export function Footer() {
  return (
    <footer className="no-print border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <p className="font-mono text-sm font-medium">Oliver Straus</p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              CFO at fourteen. Builder since. Denver, Colorado.
            </p>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Navigation
            </p>
            <ul className="mt-4 space-y-2">
              {NAVIGATION.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      if (link.isResume) {
                        e.preventDefault();
                        openResume();
                      }
                    }}
                    className="text-sm text-foreground/80 transition-colors hover:text-accent-blue"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Social
            </p>
            <div className="mt-4">
              <SocialLinks />
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Oliver Straus
          </p>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-blue opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-blue" />
            </span>
            Open to remote part-time work &amp; internships
          </div>
        </div>
      </div>
    </footer>
  );
}
