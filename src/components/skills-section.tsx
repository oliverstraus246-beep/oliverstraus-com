import { Reveal } from "@/components/reveal";
import { ScrollReveal } from "@/components/scroll-reveal";
import { RESUME } from "@/lib/resume";

export function SkillsSection() {
  return (
    <section id="skills" className="relative bg-foreground/[0.02] py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-12 gap-y-10 px-6 lg:grid-cols-[280px_1fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              05 / Stack
            </p>
            <h2 className="text-balance mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              What it&apos;s built with.
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The tools behind seven ventures — code, models, and the finance
              background that keeps them funded.
            </p>
          </Reveal>
        </div>

        <ScrollReveal className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2">
          {RESUME.skills.map((group) => (
            <div key={group.category}>
              <p className="font-mono text-xs uppercase tracking-widest text-accent-blue">
                {group.category}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.split(", ").map((item) => (
                  <span
                    key={item}
                    className="border border-border px-2.5 py-1 font-mono text-xs text-foreground/80"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
