"use client";

/** Scoped window.print() trigger for the standalone /resume route -- see
 * .resume-print-area in globals.css. Split out from page.tsx so that page
 * can stay a server component. */
export function ResumePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-150 hover:border-accent-blue hover:text-accent-blue active:scale-95"
    >
      Download PDF
    </button>
  );
}
