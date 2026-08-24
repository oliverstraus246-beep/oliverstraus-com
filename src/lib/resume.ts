// Real resume content only -- sourced from Oliver's own previously-authored
// "General Resume" (the defense-contractor and CFO experience, education,
// and community entries are carried over verbatim from that document) plus
// this session's already-verified venture facts (lib/ventures.ts) for the
// current-builds entry. No Imperial Detailing (kept off the site for tax
// reasons) and nothing invented.
export const RESUME = {
  name: "Oliver Straus",
  title: "Entrepreneur · Software Engineer · Security-Focused Builder",
  location: "Denver, CO",
  phone: "303-946-4224",
  email: "oliverstraus246@gmail.com",
  site: "oliverstraus.com",
  stats: [
    { value: "$250K+", label: "Charitable donations directed" },
    { value: "$1M+", label: "Annual revenue managed as CFO" },
    { value: "7", label: "Ventures built, run, or led solo" },
  ],
  summary:
    "Appointed CFO of a multi-million-dollar business at fourteen — not an exercise, real responsibility for financial planning, budgeting, and P&L. Since then: production software for a defense-technology contractor's drone mapping systems, and a growing portfolio of independently built AI, security, and engineering projects. I adapt fast, perform under pressure, and ship real, working systems.",
  experience: [
    {
      role: "Software Engineer",
      org: "Confidential Defense-Technology Contractor",
      context: "Autonomous Systems / UAV · Newport Beach, CA",
      dates: "Mar 2025 – May 2025",
      bullets: [
        "Contributed to a drone-based aerial mapping and reconnaissance system — processing real-time sensor feeds, spatial telemetry, and autonomous flight-path data for field operations.",
        "Developed components of a UAV mission-planning pipeline, including spatial mapping logic, obstacle-avoidance inputs, and real-time data integration for autonomous navigation.",
        "Applied reliability-first engineering standards in a production codebase where software accuracy directly impacts field operations.",
        "Operated under NDA and security protocols alongside senior engineers.",
      ],
    },
    {
      role: "Chief Financial Officer",
      org: "Topher Straus Fine Art",
      context: "Fine Art Commerce · Denver, CO",
      dates: "2020 – 2023",
      bullets: [
        "Appointed CFO at age 14 for a fine art business generating multi-million dollars annually — managed financial planning, budgeting, P&L reporting, and accounts payable/receivable for three years.",
        "Maintained financial models guiding pricing, collection valuations, exhibition ROI, and negotiations with high-net-worth collectors and institutional buyers.",
        "Architected a philanthropic giving program that distributed more than $250,000 across 15+ nonprofit organizations in arts, education, and community support.",
        "Oversaw operations: vendor contracts, event logistics, artwork shipping and insurance, and staff coordination for national exhibitions.",
      ],
    },
    {
      role: "Independent Builder",
      org: "AI, Security & Systems Projects",
      context: "Denver, CO",
      dates: "2025 – Present",
      bullets: [
        "Building Sectra, a voice-first AI assistant from scratch: a custom-trained wake word, a tuned speech pipeline, live camera object detection, and permission-scoped computer control running on local models.",
        "Built AI Agent Supervisor, an ML-engineering tool that monitors AI coding sessions for drift and prompt-injection, verified against real production session data up to 272MB with a test-first, zero-network-call test suite.",
        "Built a Brave/Chrome browser extension for security testing — a 31-tool catalog, live passive security scoring, and a native-messaging host bridging to a CLI security toolkit.",
        "Open-sourced PowerClaude, a personalization framework for AI-assisted development with 17 specialist configurations and a three-tier self-tuning system, published on GitHub under the MIT license.",
      ],
    },
  ],
  skills: [
    { category: "Programming", items: "Python, TypeScript / JavaScript, C++, React & Node.js, FastAPI" },
    { category: "AI / ML", items: "LLM integration (Claude, local models via Ollama), computer vision, speech pipelines (wake-word, STT/TTS), agent evaluation" },
    { category: "Security", items: "Penetration testing tooling, browser extension security, embedded / RF security research" },
    { category: "Business & Finance", items: "P&L management, financial modeling, sales & client acquisition, operations management" },
  ],
  // Curated, not exhaustive -- three ventures picked to demonstrate range
  // (production AI system, evaluated ML tooling, open-source distribution)
  // rather than all seven from lib/ventures.ts. Facts carried over verbatim
  // from that file, nothing added.
  projects: [
    {
      name: "Sectra",
      role: "Builder",
      description:
        "Voice-first AI assistant built from scratch: custom-trained wake word, tuned speech pipeline, live camera object detection, and permission-scoped computer control, running end to end on local models.",
      stack: "Electron, React, TypeScript, Python, FastAPI, Whisper, Ollama",
    },
    {
      name: "AI Agent Supervisor",
      role: "Builder",
      description:
        "ML-engineering tool that monitors AI coding sessions for drift and prompt-injection. Verified against real production session data up to 272MB; 29 tests passing, zero network calls in the suite.",
      stack: "Python, Claude API",
    },
    {
      name: "PowerClaude",
      role: "Builder",
      description:
        "Personalization framework for AI-assisted development — 17 specialist configurations and a three-tier self-tuning system. Open-sourced under the MIT license.",
      stack: "Node.js, Bash, Markdown",
    },
  ],
  education: {
    program: "GED — Accelerated Completion",
    detail:
      "Self-directed study, in progress. Eligibility letter secured from Colorado School of Mines; targeting admission to a top-tier program on completion.",
  },
  community: {
    org: "Golden Food Bank",
    role: "Volunteer, Operations Support",
    detail: "Food distribution, event coordination, and community outreach across the Denver metro.",
  },
} as const;
