// Single source of truth for venture data -- both the homepage grid and
// each /work/[slug] detail page read from here so the two can't drift out
// of sync. `body` and `highlights` are only populated where real,
// already-documented facts support them (vault project files, git logs,
// or a project's own README) -- never invented depth for ventures that
// don't have more to say, per this project's no-fabrication rule.
// `github` is only set where the repo is confirmed public -- most of
// these are private, so most ventures have none. Imperial Detailing and
// Apex are deliberately not listed here -- the former for tax reasons,
// the latter because Oliver doesn't consider it representative work.
export interface Venture {
  slug: string;
  role: string;
  name: string;
  description: string;
  highlights?: readonly string[];
  body?: readonly string[];
  timeframe?: string | null;
  stack?: readonly string[];
  github?: string;
}

export const VENTURES: readonly Venture[] = [
  {
    slug: "topher-straus-fine-art",
    role: "CFO",
    name: "Topher Straus Fine Art",
    description:
      "At fourteen, Oliver became CFO of Topher Straus Fine Art, a multi-million dollar fine-art business — not a symbolic title, but real responsibility for financial planning, budgeting, and P&L.",
    highlights: [
      "Appointed CFO at fourteen — real financial responsibility, not a symbolic title",
      "$250,000 directed to fifteen nonprofits over three years",
      "Handled AP/AR directly for a multi-million dollar business",
    ],
    body: [
      "Over the three years in the role, he directed $250,000 in philanthropic giving to fifteen nonprofit organizations, and handled the company's AP/AR directly rather than sitting in a ceremonial finance seat.",
    ],
    timeframe: "2020 — 2023",
    stack: [],
  },
  {
    slug: "sectra",
    role: "Builder",
    name: "Sectra",
    description:
      "Sectra is a voice-first AI assistant Oliver is building from scratch — wake word, speech, vision, and computer control, running locally on his own machine.",
    highlights: [
      "Custom-trained \"Hey Sectra\" wake word — not a generic pre-trained phrase",
      "Hunted a real speech-to-text hallucination bug down to the exact VAD/Whisper interaction causing it, then verified the fix with a synthesized round-trip test",
      "Live camera object detection (COCO-SSD, 80 classes) running fully client-side",
      "Generates parametric 3D models with geometry checked against closed-form volume math",
      "Computer control is real but permission-scoped — consequential actions confirm first",
      "Runs on local models via Ollama end to end — no per-request API cost",
    ],
    body: [
      "Sectra replaces an assistant Oliver built earlier and never actually used — the bar this time was explicit: \"this needs to be so good that I genuinely use it.\" That meant fixing root causes as they surfaced instead of shipping around them. When speech-to-text started hallucinating words that were never said, the fix was diagnosing the exact interaction between VAD silence-padding and Whisper's decoder, not swapping models and hoping.",
      "The build follows one rule throughout: no faked capabilities. If a feature isn't wired up yet — PCB design is still deferred — the interface says so honestly instead of showing a mockup that only looks like it works. What is wired up is real: live object detection running in the renderer, parametric CAD validated against exact geometric formulas, and tool-calling that lets the assistant actually act on the computer, gated behind a confirmation step for anything consequential.",
    ],
    timeframe: "2026 — Present",
    stack: ["Electron", "React", "TypeScript", "Python", "FastAPI", "Socket.IO", "Whisper", "Ollama"],
  },
  {
    slug: "ai-agent-supervisor",
    role: "Builder",
    name: "AI Agent Supervisor",
    description:
      "A tool that watches Oliver's own Claude Code sessions for drift, prompt-injection hijacking, and unverified claims — built and evaluated as a real ML engineering piece, not a wrapper around a chatbot.",
    highlights: [
      "Streaming JSONL parser handles real session transcripts up to 272MB without loading a file whole",
      "Verified against 8 real production sessions — 9,294 turns parsed, 1,012 candidate claims extracted, zero hard failures",
      "Claims checker cross-references every assistant claim against actual tool-result evidence in the same session",
      "Drift and grounding checks both return evidence plus a confidence score, never a bare label",
      "Built test-first — 29 tests passing, zero network calls in the suite via an injected fake client",
    ],
    body: [
      "The thesis driving it: depth and honest evaluation beat feature count for the audience it's aimed at — competitive CS/AI admissions now, AI-industry hiring after. So v1 stayed deliberately small — one drift/injection detector, one grounding checker, a two-tier log-or-escalate response, a live dashboard, auto-generated session summaries — rather than sprawling wide. Plausible features that would have padded scope without deepening it got cut on purpose to keep v1 small and actually finished.",
      "The claims checker walks a session's real message ancestry to gather only the evidence that existed before a given claim was made — it can't retroactively credit a claim with evidence that arrived later. Both it and the drift detector route through an LLM-judge call that returns a verdict, supporting evidence, and a confidence score, rather than a bare pass/fail.",
    ],
    timeframe: "2026 — Present",
    stack: ["Python", "Claude API", "uv"],
  },
  {
    slug: "enterprise-acquisition-platform",
    role: "Builder",
    name: "Enterprise Acquisition Platform",
    description:
      "An automated business development platform — Node.js, Supabase, Vapi voice agents, and Stripe working together to run outreach and client acquisition without manual work.",
    highlights: [
      "Nine scheduled jobs run the entire pipeline end to end, zero manual steps",
      "Vapi voice agent opens every call with a line tailored to the lead's actual website score",
      "Generates and deploys a full custom website automatically once a client pays",
      "Seven-page admin dashboard: live funnel stats, AI cost tracking, monthly P&L",
    ],
    body: [
      "The pipeline runs on nine scheduled jobs: it scrapes Google Places by industry and city, scores each lead with PageSpeed and Gemini, generates a branded audit PDF, then has a Vapi voice agent call the business with an opening line tailored to their actual website score. Voicemails auto-retry after 24 hours, and interested leads get a staged SMS/email drip sequence at every pipeline stage.",
      "Closing runs through Stripe on three tiers, plus a recurring maintenance plan — once paid, Gemini generates the full site with real copy and SEO and deploys it live on Vercel. A seven-page admin dashboard tracks the whole funnel: live stats, a pipeline kanban, per-lead AI cost tracking, and a monthly P&L.",
    ],
    timeframe: null,
    stack: ["Node.js", "Supabase", "Gemini", "Vapi", "Stripe", "Vercel"],
  },
  {
    slug: "powerclaude",
    role: "Builder",
    name: "PowerClaude",
    description:
      "PowerClaude is Oliver's own Claude Code personalization framework — persistent memory, 17 specialist AI \"windows\" for different kinds of work, and a self-tuning system that gets more accurate the longer he uses it.",
    highlights: [
      "17 specialist AI personas (\"windows\") — planning, debugging, code review, security — pinned to the work that actually fits",
      "A ~35-question interview generates a complete, personalized config — no placeholder text",
      "Three-tier self-tuning: passive logging, live confirmed check-ins, and a reinforcement layer that learns how much evidence to require before asking again",
      "Five hooks automate memory, project context, and session handoff without being asked",
      "Open-sourced on GitHub under the MIT license",
    ],
    body: [
      "Stock Claude Code starts cold every session — no memory of past decisions, no routing between different kinds of work, and any hand-written config stays frozen at whatever was true on day one. PowerClaude replaces that: a vault of project and decision history loads automatically, a hook injects stack and git state the moment a project directory opens, and model routing sends quick questions to a cheap model and real code changes to the primary one.",
      "The self-tuning system is what makes it more than a static config generator. A passive tier logs real usage; when an actual pattern emerges, Claude pauses and asks a handful of real questions with the answer applied live, never unattended; a reinforcement tier remembers whether past questions were worth asking and adjusts how much evidence it needs before asking the next one.",
    ],
    timeframe: null,
    stack: ["Node.js", "Bash", "Markdown"],
    github: "https://github.com/oliverstraus246-beep/powerclaude",
  },
  {
    slug: "brave-pentest-toolkit",
    role: "Builder",
    name: "Brave Pentest Toolkit",
    description:
      "An ambient, one-click pentesting toolkit built into the browser — a Brave/Chrome extension with a 31-tool catalog, live passive security scoring on every page, and a native-messaging host bridging to his own CLI security toolkit.",
    highlights: [
      "31-tool catalog across recon, web vulnerability, directory discovery, and network testing",
      "Passive A-F security score badge on every page, computed from real response headers",
      "Scope-gate enforcement lives in the native host, not the extension — verified adversarially, survives a full process restart",
      "Toolbar icon renders procedurally via OffscreenCanvas instead of shipping a static asset for every state combination",
      "Two real bugs caught by actually clicking through a live test harness, not just reading the code",
    ],
    body: [
      "The design puts the toolbar popup front and center — no new tabs, live scan progress, click straight through to findings — with a side panel as the expand target for scans worth keeping visible while working the page. Both share one UI module kept in sync through storage events, so either one can close mid-scan without losing state.",
      "Trust runs through a native-messaging host: a random token plus an ephemeral loopback WebSocket bootstrap the connection, and scope enforcement — what's actually in bounds to scan — checks against a file on disk the extension can't override. Web-vulnerability probes route through a verified MCP integration; everything else execs directly against an already-installed CLI toolkit, with real bugs — a scanner timeout race, a silently-broken disabled state on every action button — found and fixed through actual testing, not just review.",
    ],
    timeframe: "2026",
    stack: ["JavaScript", "Node.js", "MV3"],
  },
  {
    slug: "the-reaper",
    role: "Builder",
    name: "The Reaper",
    description:
      "The Reaper is a multi-band wireless pentesting toolkit built on the ESP32-S3 — WiFi, BLE, 2.4GHz, Sub-GHz, IR, RFID/NFC, and GPS, all from one handheld device. It's a heavily modified fork of the open-source ESP32-DIV project, built for authorized security testing only.",
    highlights: [
      "Seven radios in one handheld device: WiFi, BLE, 2.4GHz, Sub-GHz, IR, RFID/NFC, GPS",
      "PIN-lock security gating boot, full JSON-lines audit trail of every session",
      "Localhost admin dashboard for live device status and settings",
      "Fixed three real bugs in the upstream codebase — a crash-on-low-memory bug, an EEPROM address collision, and reentrancy issues",
    ],
    body: [
      "The fork goes well beyond a reskin: a full rebrand with a new boot sequence and eleven hand-tuned color themes, PIN-lock security gating boot, and an engagement log that keeps a JSON-lines audit trail of every tool session on SD.",
      "It also ships a localhost admin web dashboard for device status and live settings, plus a real correctness pass over the original codebase — a crash-on-low-memory bug in the WiFi scanner, an EEPROM address collision between saved WiFi and Sub-GHz profiles, and several reentrancy bugs, all fixed.",
      "It carries the MIT license and the attribution the original ESP32-DIV project requires.",
    ],
    timeframe: "2026",
    stack: ["C++", "Arduino", "ESP32-S3"],
  },
] as const;

export function getVenture(slug: string): Venture | undefined {
  return VENTURES.find((v) => v.slug === slug);
}
