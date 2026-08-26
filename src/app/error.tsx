"use client";

import { useEffect } from "react";
import Link from "next/link";

// Error boundaries must be Client Components. Wraps page.tsx/nested
// layouts within this segment in a React error boundary -- does not
// cover the root layout itself (that would need global-error.tsx,
// overkill for a site this size). unstable_retry, not the classic
// `reset` prop -- this Next.js version renamed it (see AGENTS.md).
// Styled to match not-found.tsx's terminal aesthetic rather than
// Next's unstyled default error screen.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-32">
      {/* Visible "500" is a styled eyebrow, not a heading -- give
          screen-reader users navigating by headings an actual page
          heading without changing the terminal aesthetic. Mirrors
          not-found.tsx. */}
      <h1 className="sr-only">Something went wrong</h1>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        500
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">
            error.sh
          </span>
        </div>
        <div className="space-y-2 p-6 font-mono text-sm sm:p-8">
          <p className="text-foreground">
            <span className="text-muted-foreground">$</span> run page
          </p>
          <p className="text-destructive">
            fatal: unhandled exception{error.digest ? ` (ref: ${error.digest})` : ""}
          </p>
          <p className="mt-4 text-foreground/80">
            Something broke on this page. Try again, or head back home.
          </p>
        </div>
      </div>
      <div className="mt-8 flex items-center gap-6">
        <button
          type="button"
          onClick={() => unstable_retry()}
          // py-1.5 -my-1.5 enlarges the tap target to ~28px (WCAG 2.2 AA 24px
          // minimum) with the negative margin cancelling the box growth so
          // the button's visual position is unchanged.
          className="group inline-flex w-fit items-center gap-1.5 py-1.5 -my-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
        >
          Try again
        </button>
        <Link
          href="/"
          className="group inline-flex w-fit items-center gap-1.5 py-1.5 -my-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            &larr;
          </span>
          Back home
        </Link>
      </div>
    </main>
  );
}
