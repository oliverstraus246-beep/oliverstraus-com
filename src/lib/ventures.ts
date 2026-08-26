// Single source of truth for venture data -- both the homepage grid and
// each /work/[slug] detail page read from here so the two can't drift out
// of sync. `body` and `highlights` are only populated where real,
// already-documented facts support them (vault project files, git logs,
// or a project's own README) -- never invented depth for ventures that
// don't have more to say, per this project's no-fabrication rule.
// `repoUrl` is only set where the repo is confirmed public on GitLab
// (verified live via the GitLab API + a direct fetch, not assumed) --
// most of these are private, so most ventures have none. Imperial
// Detailing and Apex are deliberately not listed here -- the former for
// tax reasons, the latter because Oliver doesn't consider it
// representative work (Apex's GitLab repo is also public but is
// intentionally never linked from this site for that reason).
export interface Venture {
  slug: string;
  role: string;
  name: string;
  description: string;
  highlights?: readonly string[];
  body?: readonly string[];
  // Same facts as `body`, restructured into a scannable shape for the
  // handful of ventures with enough real narrative to support it. When
  // present, the detail page renders this instead of `body` -- not both,
  // since it's the same substance reframed, not additional content.
  caseStudy?: {
    problem: string;
    approach: string;
    outcome: string;
  };
  timeframe?: string | null;
  stack?: readonly string[];
  repoUrl?: string;
  // Optional hero image for the /work/[slug] detail page. Provide a file
  // already dropped into public/ (e.g. "/assets/ventures/sectra.png") plus a
  // real alt string and it renders as a bordered figure above the body.
  // Absent for every venture until Oliver supplies a real screenshot/photo
  // -- never a placeholder, per this file's no-fabrication rule.
  image?: { src: string; alt: string };
  // Real numbers only, pulled from the same facts as `highlights`/`body` --
  // no comma formatting (CountUp's parser expects a bare number plus an
  // optional unit suffix, e.g. "272MB" or "9294").
  metrics?: readonly { value: string; label: string }[];
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
    caseStudy: {
      problem:
        "A family fine-art business needed real financial leadership, not a symbolic seat — at fourteen, Oliver was appointed CFO of a multi-million dollar company.",
      approach:
        "Handled the company's AP/AR directly for three years and maintained financial models guiding pricing, collection valuations, exhibition ROI, and negotiations with high-net-worth collectors and institutional buyers.",
      outcome:
        "$250,000 directed to fifteen nonprofit organizations over three years — real financial responsibility, not a ceremonial finance seat.",
    },
    timeframe: "2020 — 2023",
    stack: [],
    metrics: [
      { value: "14", label: "Age appointed CFO" },
      { value: "$250K", label: "Directed to nonprofits" },
      { value: "15", label: "Nonprofits reached" },
      { value: "3", label: "Years in the role" },
    ],
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
    caseStudy: {
      problem:
        "Sectra replaces an assistant Oliver built earlier and never actually used. The bar this time was explicit: \"this needs to be so good that I genuinely use it\" — which meant fixing root causes as they surfaced instead of shipping around them.",
      approach:
        "When speech-to-text started hallucinating words that were never said, the fix was diagnosing the exact interaction between VAD silence-padding and Whisper's decoder, not swapping models and hoping. The build follows one rule throughout: no faked capabilities. If a feature isn't wired up yet — PCB design is still deferred — the interface says so honestly instead of showing a mockup that only looks like it works.",
      outcome:
        "Live object detection running in the renderer, parametric CAD validated against exact geometric formulas, and tool-calling that lets the assistant actually act on the computer, gated behind a confirmation step for anything consequential.",
    },
    timeframe: "2026 — Present",
    stack: ["Electron", "React", "TypeScript", "Python", "FastAPI", "Socket.IO", "Whisper", "Ollama"],
    metrics: [
      { value: "1", label: "Custom wake-word trained" },
      { value: "0", label: "Per-request API cost" },
      { value: "4", label: "Parametric CAD primitives" },
    ],
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
    caseStudy: {
      problem:
        "Depth and honest evaluation beat feature count for the audience it's aimed at — competitive CS/AI admissions now, AI-industry hiring after. Plausible features that would have padded scope without deepening it needed to be cut on purpose.",
      approach:
        "v1 stayed deliberately small: one drift/injection detector, one grounding checker, a two-tier log-or-escalate response, a live dashboard, auto-generated session summaries. The claims checker walks a session's real message ancestry to gather only the evidence that existed before a given claim was made — it can't retroactively credit a claim with evidence that arrived later. Both it and the drift detector route through an LLM-judge call that returns a verdict, supporting evidence, and a confidence score, rather than a bare pass/fail.",
      outcome:
        "Verified against 8 real production sessions — 9,294 turns parsed, 1,012 candidate claims extracted, zero hard failures. Built test-first: 29 tests passing, zero network calls in the suite via an injected fake client.",
    },
    timeframe: "2026 — Present",
    stack: ["Python", "Claude API", "uv"],
    repoUrl: "https://gitlab.com/oliverstraus/agent-supervisor",
    metrics: [
      { value: "272MB", label: "Largest session file parsed" },
      { value: "9294", label: "Turns parsed in verification" },
      { value: "1012", label: "Candidate claims extracted" },
      { value: "29", label: "Tests passing" },
    ],
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
    caseStudy: {
      problem:
        "Business development that runs end to end without manual work — scraping, scoring, outreach, and closing all connected into one pipeline instead of a founder doing it by hand.",
      approach:
        "Nine scheduled jobs run the pipeline: it scrapes Google Places by industry and city, scores each lead with PageSpeed and Gemini, generates a branded audit PDF, then has a Vapi voice agent call the business with an opening line tailored to their actual website score. Voicemails auto-retry after 24 hours, and interested leads get a staged SMS/email drip sequence at every pipeline stage.",
      outcome:
        "Closing runs through Stripe on three tiers, plus a recurring maintenance plan — once paid, Gemini generates the full site with real copy and SEO and deploys it live on Vercel. A seven-page admin dashboard tracks the whole funnel: live stats, a pipeline kanban, per-lead AI cost tracking, and a monthly P&L.",
    },
    timeframe: null,
    stack: ["Node.js", "Supabase", "Gemini", "Vapi", "Stripe", "Vercel"],
    metrics: [
      { value: "9", label: "Scheduled jobs run the pipeline" },
      { value: "3", label: "Pricing tiers" },
      { value: "7", label: "Admin dashboard pages" },
      { value: "24", label: "Hour voicemail retry window" },
    ],
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
      "Open-sourced under the MIT license",
    ],
    caseStudy: {
      problem:
        "Stock Claude Code starts cold every session — no memory of past decisions, no routing between different kinds of work, and any hand-written config stays frozen at whatever was true on day one.",
      approach:
        "A vault of project and decision history loads automatically, a hook injects stack and git state the moment a project directory opens, and model routing sends quick questions to a cheap model and real code changes to the primary one. A ~35-question interview generates a complete, personalized config.",
      outcome:
        "A three-tier self-tuning system — passive logging, live confirmed check-ins, and a reinforcement layer that adjusts how much evidence it needs before asking again — makes it more than a static config generator. Open-sourced under the MIT license.",
    },
    timeframe: null,
    stack: ["Node.js", "Bash", "Markdown"],
    repoUrl: "https://gitlab.com/oliverstraus/powerclaude",
    metrics: [
      { value: "17", label: "Specialist configurations" },
      { value: "5", label: "Automation hooks" },
      { value: "3", label: "Self-tuning tiers" },
      { value: "35", label: "Personalization interview questions" },
    ],
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
    caseStudy: {
      problem:
        "Ambient, one-click pentesting needs to live in the browser without new tabs or lost scan state — and trust has to be enforceable, not just described in the UI.",
      approach:
        "The toolbar popup is front and center with live scan progress, backed by a side panel for scans worth keeping visible while working the page — both share one UI module kept in sync through storage events. Trust runs through a native-messaging host: a random token plus an ephemeral loopback WebSocket bootstrap the connection, and scope enforcement checks against a file on disk the extension can't override.",
      outcome:
        "A 31-tool catalog, a passive A-F security score computed from real response headers, and two real bugs — a scanner timeout race and a silently-broken disabled state — caught by actually clicking through a live test harness, not just reading the code.",
    },
    timeframe: "2026",
    stack: ["JavaScript", "Node.js", "MV3"],
    metrics: [
      { value: "31", label: "Tools in the catalog" },
      { value: "2", label: "Real bugs caught by testing" },
    ],
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
    caseStudy: {
      problem:
        "A fork of the open-source ESP32-DIV project needed to go well beyond a reskin — real security gating, a real audit trail, and a real correctness pass over the upstream code, not just new colors.",
      approach:
        "A full rebrand with a new boot sequence and eleven hand-tuned color themes, PIN-lock security gating boot, and a JSON-lines audit trail of every session on SD. Also ships a localhost admin dashboard for device status and live settings.",
      outcome:
        "Three real upstream bugs fixed — a crash-on-low-memory bug in the WiFi scanner, an EEPROM address collision between saved WiFi and Sub-GHz profiles, and several reentrancy bugs — carrying the MIT license and the attribution the original project requires.",
    },
    timeframe: "2026",
    stack: ["C++", "Arduino", "ESP32-S3"],
    metrics: [
      { value: "7", label: "Radios in one device" },
      { value: "11", label: "Hand-tuned color themes" },
      { value: "3", label: "Upstream bugs fixed" },
    ],
  },
] as const;

export function getVenture(slug: string): Venture | undefined {
  return VENTURES.find((v) => v.slug === slug);
}
