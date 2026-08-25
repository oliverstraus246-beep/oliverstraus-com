import { Hero } from "@/components/hero";
import { VenturesSection } from "@/components/ventures-section";
import { TimelineSection } from "@/components/timeline-section";
import { PhilosophySection } from "@/components/philosophy-section";
import { StatsSection } from "@/components/stats-section";
import { SkillsSection } from "@/components/skills-section";
import { TerminalContact } from "@/components/terminal-contact";
import { DotGrid } from "@/components/dot-grid";

export default function Home() {
  return (
    <main>
      <Hero />
      <VenturesSection />
      <TimelineSection />
      <PhilosophySection />
      <StatsSection />
      <SkillsSection />
      <section id="contact" className="relative overflow-hidden py-20">
        <div className="absolute inset-0" aria-hidden="true">
          <DotGrid />
        </div>
        <div className="pointer-events-none relative mx-auto max-w-6xl px-6 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_form]:pointer-events-auto [&_input]:pointer-events-auto">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            06 / Contact
          </p>
          <h2 className="text-balance mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Open a channel.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            oliverstraus246@gmail.com · (303) 946-4224
          </p>
          <p className="mt-3 max-w-md font-mono text-xs text-muted-foreground">
            <span className="text-accent-blue">Now:</span> GED sprint,
            building Sectra, applying to Colorado community colleges.
          </p>
          <div className="mx-auto mt-12 max-w-2xl">
            <TerminalContact />
          </div>
        </div>
      </section>
    </main>
  );
}
