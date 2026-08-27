"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SpotlightCard } from "@/components/spotlight-card";
import { VENTURES } from "@/lib/ventures";

// On a phone, seven full venture cards stacked is ~3.5 screens of scrolling
// before the next section even starts -- the bulk of the "feels cluttered /
// too long on mobile" problem. Show a scannable preview of the first few and
// let the rest expand in place; desktop (sm+) is unaffected and shows all of
// them in the 2-column grid as before. The reveal is pure DOM, not a route
// change, so nothing the user already scrolled to jumps.
const MOBILE_PREVIEW = 3;

export function VentureGrid() {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = VENTURES.length - MOBILE_PREVIEW;

  return (
    <>
      <ScrollReveal className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 sm:gap-5 md:grid-cols-2">
        {VENTURES.map((venture, i) => {
          // Cards past the preview are display:none on mobile until expanded;
          // sm:block re-shows them on >=640px so the desktop grid is complete.
          const hiddenUnlessExpanded =
            i >= MOBILE_PREVIEW && !expanded ? " hidden sm:block" : "";
          return (
            <SpotlightCard
              key={venture.slug}
              href={`/work/${venture.slug}`}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:shadow-[0_0_24px_-14px_var(--accent-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue sm:p-8${hiddenUnlessExpanded}`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-border transition-colors duration-300 group-hover:bg-accent-blue/40" />
              <div className="relative z-[2] flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {venture.role}
                  </p>
                  <h3 className="text-balance mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                    {venture.name}
                  </h3>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")} / {String(VENTURES.length).padStart(2, "0")}
                </span>
              </div>
              <p className="text-pretty relative z-[2] mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4">
                {venture.description}
              </p>
              {venture.stack && venture.stack.length > 0 && (
                <div className="relative z-[2] mt-4 flex flex-wrap items-center gap-1.5">
                  {venture.stack.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                  {venture.stack.length > 3 && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      +{venture.stack.length - 3}
                    </span>
                  )}
                </div>
              )}
              <div className="relative z-[2] mt-5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors duration-300 sm:mt-6">
                View details
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </div>
            </SpotlightCard>
          );
        })}
      </ScrollReveal>

      {hiddenCount > 0 && (
        <div className="mt-6 sm:hidden">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="w-full rounded-full border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-accent-blue hover:text-accent-blue active:scale-[0.98]"
          >
            {expanded
              ? "Show fewer ventures"
              : `Show ${hiddenCount} more ventures`}
          </button>
        </div>
      )}
    </>
  );
}