import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { ScrollReveal } from "@/components/scroll-reveal";
import { TimelineProgress } from "@/components/timeline-progress";

interface TimelineEntry {
  readonly date: string;
  readonly role: string;
  readonly name: string;
  readonly description: string;
  readonly expand: string;
  readonly href?: string;
  readonly cta?: string;
}

// Reverse-chronological, real dates only -- "Ongoing" is used only for
// ventures.ts entries with timeframe: null that are still under active
// development, never as a stand-in for an unknown date. Sourced from
// lib/ventures.ts and lib/resume.ts -- no new facts invented here. Each
// entry carries an `expand` paragraph revealed by clicking the row, so the
// surface stays scannable while the depth is one tap away.
const TIMELINE: readonly TimelineEntry[] = [
  {
    date: "Ongoing",
    role: "Independent study",
    name: "GED — Accelerated Completion",
    description:
      "All four GED subjects in a single week, targeting 175+ for college credit. Already scoring in the 170s on practice tests before the real run. Eligibility letter secured from Colorado School of Mines.",
    expand:
      "Not a delay: a deliberate shortcut. The traditional four-year high school path was available; this one moves faster. All four subjects are studied simultaneously in a single week, targeting 175+ (the threshold that earns college credit), and practice tests are already landing in the 170s before the real attempt. Studying at home on my own schedule rather than a classroom. The plan: bank roughly twelve college credits from the scores before ever enrolling, then enter a Colorado community college for philosophy, AI, and coding at 12+ credits a semester. The system rewards the credential, not the seat time, so the seat time is what gets cut.",
  },
  {
    date: "2026 — Present",
    role: "Builder",
    name: "Sectra",
    description:
      "Voice-first AI assistant built from scratch: wake word, speech, vision, computer control, running locally.",
    expand:
      "A voice-first assistant built to a hard bar: it has to be good enough to actually use, not just demo. That meant fixing root causes as they surfaced, hunting a speech-to-text hallucination bug down to the exact VAD/Whisper interaction rather than swapping models and hoping. Runs end to end on local models via Ollama, so there's no per-request API cost. Live camera object detection, parametric 3D CAD validated against closed-form geometry, and computer control gated behind a confirmation step for anything consequential.",
    href: "/work/sectra",
    cta: "Read the full case study",
  },
  {
    date: "2026 — Present",
    role: "Builder",
    name: "AI Agent Supervisor",
    description:
      "ML-engineering tool watching Oliver's own Claude Code sessions for drift and prompt-injection.",
    expand:
      "A real ML-engineering piece, not a wrapper around a chatbot. It watches agentic coding sessions for drift, prompt-injection hijacking, and unverified claims, and gets evaluated against a rubric rather than judged by vibes. Built to catch the failure modes that show up only over long autonomous runs.",
    href: "/work/ai-agent-supervisor",
    cta: "Read the full case study",
  },
  {
    date: "Ongoing",
    role: "Builder",
    name: "PowerClaude",
    description:
      "Claude Code personalization framework: 17 specialist configurations, open-sourced under the MIT license.",
    expand:
      "A personalization framework for Claude Code: hooks, a markdown vault, and 17 specialist agent configurations. Open-sourced under MIT so the attribution and the license carry cleanly. This very site's workflow runs on a version of it.",
    href: "/work/powerclaude",
    cta: "Read the full case study",
  },
  {
    date: "2026",
    role: "Builder",
    name: "The Reaper",
    description:
      "Multi-band wireless pentesting toolkit on the ESP32-S3: seven radios in one handheld device.",
    expand:
      "A heavily modified fork of the open-source ESP32-DIV, not a reskin. Seven radios (WiFi, BLE, 2.4GHz, Sub-GHz, IR, RFID/NFC, GPS) in one handheld, PIN-lock security gating on boot, a JSON-lines audit trail of every session, and a localhost admin dashboard. Three real upstream bugs fixed along the way, carrying the MIT license and attribution the original requires. Authorized security testing only.",
    href: "/work/the-reaper",
    cta: "Read the full case study",
  },
  {
    date: "2026",
    role: "Builder",
    name: "Brave Pentest Toolkit",
    description:
      "Browser extension with a 31-tool catalog and live passive security scoring, bridged to a native CLI toolkit.",
    expand:
      "A browser extension exposing a 31-tool catalog with live passive security scoring, bridged to a native CLI toolkit so the browser surface and the command line share one toolchain. Built for authorized testing workflows, not mass targeting.",
    href: "/work/brave-pentest-toolkit",
    cta: "Read the full case study",
  },
  {
    date: "Ongoing",
    role: "Builder",
    name: "Enterprise Acquisition Platform",
    description:
      "Automated business-development platform running lead scoring, outreach, and client acquisition end to end.",
    expand:
      "An automated business-development pipeline: lead scoring, outreach, and client acquisition running end to end. The kind of internal tooling that turns a service business into something closer to a system than a hustle.",
    href: "/work/enterprise-acquisition-platform",
    cta: "Read the full case study",
  },
  {
    date: "Mar 2025 — May 2025",
    role: "Software Engineer",
    name: "Confidential Defense-Technology Contractor",
    description:
      "Drone-based aerial mapping and UAV mission-planning pipeline: spatial logic, obstacle avoidance, real-time data integration.",
    expand:
      "Software engineering work on a drone-based aerial mapping and UAV mission-planning pipeline: spatial logic, obstacle avoidance, and real-time data integration. Under NDA, so the specifics stay here.",
  },
  {
    date: "2020 — 2023",
    role: "CFO",
    name: "Topher Straus Fine Art",
    description:
      "Appointed at fourteen. Financial planning, budgeting, P&L, and AP/AR for a multi-million dollar business.",
    expand:
      "Appointed CFO at fourteen, not a symbolic title. The actual books, the actual payroll, financial planning, budgeting, P&L, and AP/AR for a multi-million dollar business over three years. $250,000 directed to fifteen nonprofits across the run. The finance discipline from this is what keeps the ventures funded now.",
    href: "/work/topher-straus-fine-art",
    cta: "Read the full case study",
  },
];

// Each row is a native <details>/<summary> disclosure -- zero JS, fully
// keyboard-accessible, and works on every device without hydration. The
// summary holds the scannable surface (name, date, role, one-line
// description); the body reveals the deeper paragraph and, for ventures, a
// link into the full case study. Links live in the body, not the summary, so
// toggling and navigating never collide.
function TimelineRow({ entry }: { entry: TimelineEntry }) {
  return (
    <details className="group relative pb-6 pl-8 last:pb-0 sm:pb-10">
      <summary className="cursor-pointer list-none rounded-md px-2 -mx-2 py-1.5 transition-colors duration-150 hover:bg-foreground/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <span
          aria-hidden="true"
          className="absolute left-0 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-accent-blue bg-background transition-colors duration-300 group-open:border-accent-blue group-open:bg-accent-blue"
        />
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-balance text-lg font-bold tracking-tight text-foreground">
            {entry.name}
          </h3>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {entry.date}
          </span>
        </div>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-accent-blue">
          {entry.role}
        </p>
        <p className="text-pretty mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {entry.description}
        </p>
        <span className="mt-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-accent-blue group-open:text-accent-blue">
          <span className="transition-transform duration-300 group-open:rotate-90" aria-hidden="true">
            &#x2023;
          </span>
          <span className="group-open:hidden">More</span>
          <span className="hidden group-open:inline">Less</span>
        </span>
      </summary>
      <div className="mt-4 max-w-2xl border-l-2 border-accent-blue/30 pl-4">
        <p className="text-pretty text-sm leading-relaxed text-foreground/80">
          {entry.expand}
        </p>
        {entry.href && (
          <Link
            href={entry.href}
            // py-1.5 -my-1.5: grows the tap target to ~28px tall (clearing the
            // WCAG 2.2 AA 24px minimum) while the negative vertical margin
            // cancels the box growth in the flow, so the link text stays at
            // exactly the same position and the surrounding spacing is
            // unchanged. The hit area simply extends 6px above and below the
            // visible text -- invisible enlargement, no visual shift.
            className="group/link mt-4 inline-flex items-center gap-1.5 py-1.5 -my-1.5 font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors hover:text-accent-blue-dim"
          >
            {entry.cta ?? "Read more"}
            <span aria-hidden="true" className="transition-transform duration-300 group-hover/link:translate-x-1">
              &rarr;
            </span>
          </Link>
        )}
      </div>
    </details>
  );
}

export function TimelineSection() {
  return (
    <section id="timeline" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            03 / Timeline
          </p>
          <h2 className="text-balance mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            How it built up.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Tap any entry for the full story.
          </p>
        </Reveal>

        <div className="relative mt-10 max-w-3xl sm:mt-16">
          <TimelineProgress />
          <ScrollReveal>
            {TIMELINE.map((entry) => (
              <TimelineRow key={entry.name} entry={entry} />
            ))}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}