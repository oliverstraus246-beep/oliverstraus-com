import { Reveal } from "@/components/reveal";
import { VentureGrid } from "@/components/ventures-grid";
import { VENTURES } from "@/lib/ventures";

export function VenturesSection() {
  return (
    <section id="work" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            02 / Work
          </p>
          <h2 className="text-balance mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            {VENTURES.length} ventures. Built, run, or led solo.
          </h2>
        </Reveal>

        <VentureGrid />
      </div>
    </section>
  );
}
