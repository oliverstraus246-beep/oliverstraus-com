import { CountUp } from "@/components/count-up";
import { ScrollReveal } from "@/components/scroll-reveal";
import { STATS } from "@/lib/stats";

export function StatsSection() {
  return (
    <section className="border-y border-border py-20">
      {/* The stats strip has no visible heading (it's a full-bleed band of
       * numbers between About and Stack), so without this it's invisible to
       * screen-reader heading navigation -- a user jumping by headings skips
       * from "How the work gets decided" straight to "What it's built with"
       * and never reaches the impact numbers. The sr-only h2 makes the band
       * a navigable stop without changing the visual. */}
      <h2 className="sr-only">Impact by the numbers</h2>
      <ScrollReveal className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="text-4xl font-black tracking-tight text-foreground">
              <CountUp value={stat.value} />
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest">
              {stat.label}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.caption}</p>
          </div>
        ))}
      </ScrollReveal>
    </section>
  );
}
