import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not Found",
  description: "The page you're looking for doesn't exist.",
};

// Composes with the root layout automatically (nav, footer, theme, fonts)
// since this isn't a full HTML document -- Next.js handles both notFound()
// calls within route segments and any unmatched URL site-wide with this
// one file. Styled to match the terminal aesthetic used elsewhere (boot
// sequence, the About section's career.log window) rather than falling
// back to Next's unstyled default 404.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-32">
      {/* Visible "404" is a styled eyebrow, not a heading -- give screen-reader
          users navigating by headings an actual page heading without changing
          the terminal aesthetic. */}
      <h1 className="sr-only">Page not found</h1>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">
            not-found.sh
          </span>
        </div>
        <div className="space-y-2 p-6 font-mono text-sm sm:p-8">
          <p className="text-foreground">
            <span className="text-muted-foreground">$</span> cat requested-page.html
          </p>
          <p className="text-destructive">
            cat: requested-page.html: No such file or directory
          </p>
          <p className="mt-4 text-foreground/80">
            That page doesn&apos;t exist. It may have moved, or the link was
            wrong.
          </p>
        </div>
      </div>
      <Link
        href="/"
        className="group mt-8 inline-flex w-fit items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-1">
          &larr;
        </span>
        Back home
      </Link>
    </main>
  );
}
