import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

interface TimelineEntry {
  readonly date: string;
  readonly role: string;
  readonly name: string;
  readonly description: string;
  readonly href?: string;
}

// Reverse-chronological, real dates only -- "Ongoing" is used only for
// ventures.ts entries with timeframe: null that are still under active
// development, never as a stand-in for an unknown date. Sourced from
// lib/ventures.ts and lib/resume.ts -- no new facts invented here.
const TIMELINE: readonly TimelineEntry[] = [
  {
    date: "Ongoing",
    role: "Independent study",
    name: "GED — Accelerated Completion",
    description:
      "Self-directed study for all four subjects at once. Eligibility letter already secured from Colorado School of Mines.",
  },
  {
    date: "2026 — Present",
    role: "Builder",
    name: "Sectra",
    description:
      "Voice-first AI assistant built from scratch — wake word, speech, vision, computer control, running locally.",
    href: "/work/sectra",
  },
  {
    date: "2026 — Present",
    role: "Builder",
    name: "AI Agent Supervisor",
    description:
      "ML-engineering tool watching Oliver's own Claude Code sessions for drift and prompt-injection.",
    href: "/work/ai-agent-supervisor",
  },
  {
    date: "Ongoing",
    role: "Builder",
    name: "PowerClaude",
    description:
      "Claude Code personalization framework — 17 specialist configurations, open-sourced under the MIT license.",
    href: "/work/powerclaude",
  },
  {
    date: "2026",
    role: "Builder",
    name: "The Reaper",
    description:
      "Multi-band wireless pentesting toolkit on the ESP32-S3 — seven radios in one handheld device.",
    href: "/work/the-reaper",
  },
  {
    date: "2026",
    role: "Builder",
    name: "Brave Pentest Toolkit",
    description:
      "Browser extension with a 31-tool catalog and live passive security scoring, bridged to a native CLI toolkit.",
    href: "/work/brave-pentest-toolkit",
  },
  {
    date: "Ongoing",
    role: "Builder",
    name: "Enterprise Acquisition Platform",
    description:
      "Automated business-development platform running lead scoring, outreach, and client acquisition end to end.",
    href: "/work/enterprise-acquisition-platform",
  },
  {
    date: "Mar 2025 — May 2025",
    role: "Software Engineer",
    name: "Confidential Defense-Technology Contractor",
    description:
      "Drone-based aerial mapping and UAV mission-planning pipeline — spatial logic, obstacle avoidance, real-time data integration.",
  },
  {
    date: "2020 — 2023",
    role: "CFO",
    name: "Topher Straus Fine Art",
    description:
      "Appointed at fourteen. Financial planning, budgeting, P&L, and AP/AR for a multi-million dollar business.",
    href: "/work/topher-straus-fine-art",
  },
];

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const content = (
    <>
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
    </>
  );

  return (
    <div className="relative pb-10 pl-8 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute left-0 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-accent-blue bg-background"
      />
      {entry.href ? (
        <Link href={entry.href} className="group block transition-opacity hover:opacity-70">
          {content}
        </Link>
      ) : (
        <div>{content}</div>
      )}
    </div>
  );
}

export function TimelineSection() {
  return (
    <section id="timeline" className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          03 / Timeline
        </p>
        <h2 className="text-balance mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          How it built up.
        </h2>

        <ScrollReveal className="mt-16 max-w-3xl border-l border-border">
          {TIMELINE.map((entry) => (
            <TimelineRow key={entry.name} entry={entry} />
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
