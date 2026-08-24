import { ScrollReveal } from "@/components/scroll-reveal";
import { SpotlightCard } from "@/components/spotlight-card";
import { VENTURES } from "@/lib/ventures";

export function VenturesSection() {
  return (
    <section id="work" className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          02 / Work
        </p>
        <h2 className="text-balance mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          {VENTURES.length} ventures. Built, run, or led solo.
        </h2>

        <ScrollReveal className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
          {VENTURES.map((venture, i) => {
            return (
              <SpotlightCard
                key={venture.slug}
                href={`/work/${venture.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-[0_0_24px_-14px_var(--accent-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-border transition-colors duration-300 group-hover:bg-accent-blue/40" />
                <div className="relative z-[2] flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      {venture.role}
                    </p>
                    <h3 className="text-balance mt-2 text-2xl font-bold tracking-tight">
                      {venture.name}
                    </h3>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} / {String(VENTURES.length).padStart(2, "0")}
                  </span>
                </div>
                <p className="text-pretty relative z-[2] mt-4 text-sm leading-relaxed text-muted-foreground">
                  {venture.description}
                </p>
                <div className="relative z-[2] mt-6 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors duration-300">
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
      </div>
    </section>
  );
}
