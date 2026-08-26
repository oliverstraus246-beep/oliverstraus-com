const LOG = [
  {
    year: "2020",
    tag: "CFO_APPOINTED",
    body: "Topher Straus Fine Art. Age fourteen. Financial planning, budgeting, P&L, AP/AR for a multi-million dollar business.",
  },
  {
    year: "2020-2023",
    tag: "IMPACT",
    body: "$250,000 directed to fifteen nonprofits over three years. Not a symbolic title. The actual books.",
  },
  {
    year: "2026",
    tag: "FOUNDED",
    body: "Sectra. Voice-first AI assistant, built from scratch — wake word, speech, vision, computer control. Runs locally, no per-request cost.",
  },
  {
    year: "2025",
    tag: "ENGINEERING",
    body: "Software engineer, defense-tech contractor. Drone and UAV mission-planning. Under NDA.",
  },
  {
    year: "ONGOING",
    tag: "IN_PROGRESS",
    body: "Self-directed education. A GED in progress, not a delay. The traditional path was available. This one moves faster.",
  },
] as const;

import { Reveal } from "@/components/reveal";

export function PhilosophySection() {
  return (
    <section id="about" className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            04 / About
          </p>
          <h2 className="text-balance mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            How the work gets decided.
          </h2>
        </Reveal>

        <div className="mt-16 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">
              career.log
            </span>
          </div>

          <div className="space-y-6 p-6 font-mono text-sm sm:p-10">
            {LOG.map((entry) => (
              <div
                key={entry.tag}
                className="flex flex-col gap-1 sm:flex-row sm:gap-6"
              >
                <span className="shrink-0 text-muted-foreground whitespace-pre">
                  [{entry.year}]
                </span>
                <span className="shrink-0 text-foreground whitespace-pre">
                  {entry.tag.padEnd(14, " ")}
                </span>
                <span className="leading-relaxed text-foreground/80">
                  {entry.body}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 text-foreground">
              <span>$</span>
              <span className="h-4 w-2 animate-pulse bg-foreground" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
