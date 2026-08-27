import { Hero } from "@/components/hero";
import { VenturesSection } from "@/components/ventures-section";
import { TimelineSection } from "@/components/timeline-section";
import { PhilosophySection } from "@/components/philosophy-section";
import { StatsSection } from "@/components/stats-section";
import { SkillsSection } from "@/components/skills-section";
import { TerminalContact } from "@/components/terminal-contact";
import { CopyButton } from "@/components/copy-button";
import { Reveal } from "@/components/reveal";
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
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              06 / Contact
            </p>
            <h2 className="text-balance mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Open a channel.
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              <a
                href="mailto:oliverstraus246@gmail.com"
                className="transition-colors hover:text-accent-blue"
              >
                oliverstraus246@gmail.com
              </a>
              <CopyButton
                value="oliverstraus246@gmail.com"
                label="email"
                className="ml-1"
              />
              {" · "}
              <a
                href="tel:+13039464224"
                className="transition-colors hover:text-accent-blue"
              >
                (303) 946-4224
              </a>
            </p>
            <p className="mt-3 max-w-md font-mono text-xs text-muted-foreground">
              <span className="text-accent-blue">Now:</span> GED sprint ·
              building Sectra · Colorado community college-bound. Open to
              remote part-time work &amp; internships.
            </p>
          </Reveal>
          <div className="mx-auto mt-12 max-w-2xl">
            <TerminalContact />
          </div>
        </div>
      </section>
    </main>
  );
}
