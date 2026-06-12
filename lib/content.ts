export const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Press", href: "/press" },
  { label: "Contact", href: "/contact" },
];

export const roles = [
  { label: "CFO at 14", sub: "Fine Art" },
  { label: "Defense Engineer", sub: "UAV Systems" },
  { label: "Founder & CEO", sub: "Imperial Detailing" },
  { label: "AI Builder", sub: "10+ Products" },
  { label: "Producer", sub: "IMDb nm8461530" },
];

export type Stat =
  | { countUp: true; target: number; prefix: string; suffix: string; label: string }
  | { countUp: false; display: string; label: string };

export const stats: Stat[] = [
  { countUp: true, target: 15, prefix: "", suffix: "+", label: "Nonprofits funded" },
  { countUp: true, target: 10, prefix: "", suffix: "+", label: "Products shipped" },
  { countUp: true, target: 14, prefix: "", suffix: "", label: "Age appointed CFO" },
];

// Four kinetic acts. Each word erupts in 3D, then lands as the first
// word of its sentence. Zero fact repetition across acts.
export const acts = {
  cfo: { word: "CFO", rest: "at fourteen." },
  founder: { word: "FOUNDER", rest: "before a driver’s license." },
  giving: { word: "$250K", rest: "given, not kept." },
  builder: { word: "BUILDER", rest: "of software that runs itself." },
};

export const fineArt = {
  label: "Experience",
  paragraphs: [
    "Appointed Chief Financial Officer of Topher Straus Fine Art at fourteen — one of the youngest CFOs of a multi-million dollar company in United States history. For three years he ran financial planning, budgeting, P&L reporting, and accounts payable and receivable for a fine art business generating multi-million dollars annually.",
    "His financial models guided pricing, collection valuations, and negotiations with high-net-worth collectors and institutional buyers. He didn’t inherit the role. He ran it.",
  ],
  facts: [
    { value: "2020–2023", label: "Tenure" },
    { value: "HNW", label: "Collector base" },
    { value: "14", label: "Age at appointment" },
  ],
};

export const imperial = {
  label: "Venture",
  paragraphs: [
    "Built Imperial Detailing, a luxury mobile auto detailing operation in Denver — launched from scratch in a single season, without a dollar of outside capital.",
    "Every business function ran through him: sales, operations, finance. When no software fit, he wrote his own — custom booking automation and client management tools built in React and Node.js.",
  ],
  facts: [
    { value: "2025–Present", label: "Operating" },
    { value: "Year 1", label: "Operating" },
    { value: "$0", label: "Outside capital" },
  ],
};

export const philanthropy = {
  label: "Philanthropy",
  paragraphs: [
    "As Philanthropy Director at Topher Straus Fine Art, Oliver directed a quarter-million dollars to more than fifteen nonprofit organizations in arts, education, and community development — across Colorado and nationally.",
    "The program ran for three years on deliberate, relationship-based giving rather than one-time checks. He also volunteers operations support with B Golden Food Bank across the Denver metro.",
  ],
  facts: [
    { value: "15+", label: "Nonprofit partners" },
    { value: "3 yrs", label: "Program tenure" },
    { value: "100%", label: "Relationship-based" },
  ],
  statement: "Giving is part of the model, not an afterthought.",
};

export const defense = {
  paragraphs: [
    "In 2025, contracted as a software engineer for a confidential defense-technology company building autonomous systems. He contributed to a drone-based aerial mapping and reconnaissance platform processing real-time sensor feeds, spatial telemetry, and autonomous flight-path data — and developed components of a UAV mission-planning pipeline alongside senior engineers, under NDA and security protocols.",
  ],
};

export const products = [
  {
    name: "Apex",
    description:
      "AI life coaching desktop platform combining behavioral psychology with Claude. Conversational coaching, habit tracking, intelligent journaling — designed and shipped entirely solo.",
    stack: "Electron · React · Claude",
  },
  {
    name: "Ada",
    description:
      "An AI agent with full autonomous computer control. Interacts with any application, executes workflows, manages files, and operates the desktop without human input.",
    stack: "AI Agent · Automation",
  },
  {
    name: "Enterprise Acquisition Platform",
    description:
      "Fully automated business development pipeline. AI voice agents call leads, qualify them, and collect payment — end to end, with minimal human oversight.",
    stack: "Vapi · Supabase · Stripe",
  },
  {
    name: "Command Center",
    description:
      "Developer intelligence dashboard for managing AI sessions, tools, and workflows with real-time monitoring.",
    stack: "Electron · React · Vite",
  },
];

export const bioShort = `Oliver Straus is a 16-year-old founder, operator, and software engineer based in Denver, Colorado. Appointed CFO of a multi-million dollar fine art business at fourteen, he directed $250,000+ to more than fifteen nonprofits, shipped production software for defense UAV systems under NDA, founded a detailing company profitable in its first season, and has built more than ten software products — including an AI life coach, an autonomous computer-control agent, and a fully automated acquisition pipeline. He has been building companies longer than most people his age have had jobs.`;

export const bioFull = `Oliver Straus (born 2010, Denver, Colorado) is an American entrepreneur and software engineer — widely recognized as one of the youngest Chief Financial Officers of a multi-million dollar company in United States history.

Oliver Straus grew up in Denver as the son of Topher Straus, a digital painter and fine art entrepreneur whose work has been featured in Foothills Living Magazine and the Lakewood Sentinel. Early exposure to the business behind the art gave Oliver firsthand experience with financial management, client relationships, and the mechanics of a multi-million dollar enterprise — years before most people see their first paycheck.

At fourteen, Oliver Straus was appointed CFO of Topher Straus Fine Art. For three years he managed financial planning, budgeting, P&L reporting, and accounts receivable for a business generating multi-million dollars annually. His financial models guided pricing, collection valuations, and negotiations with high-net-worth collectors and institutional buyers. He also architected the company’s philanthropic giving program, directing more than $250,000 to fifteen-plus nonprofit organizations in arts, education, and community development.

In 2025, Oliver Straus contracted as a software engineer for a confidential defense-technology company, contributing to a drone-based aerial mapping and reconnaissance system and developing components of a UAV mission-planning pipeline — production software for autonomous military systems, written under NDA alongside senior engineers.

The same year he founded Imperial Detailing, a luxury mobile auto detailing company that built a client base and ran fully on custom software he wrote himself — booking automation and a client management system built in React and Node.js, without outside capital.

On the software side, Oliver Straus writes all production code across his ventures — JavaScript, TypeScript, React, Node.js, Electron, Supabase, PostgreSQL, and AI infrastructure including Anthropic’s Claude and Vapi voice systems. His shipped products include Apex, an AI life coaching platform; Ada, an autonomous computer-control agent; and a fully automated enterprise acquisition pipeline that prospects, qualifies, and bills without human intervention.

Oliver Straus chose a self-directed educational path, stepping away from traditional school to build companies — pursuing his GED independently with university enrollment planned for 2027. He also holds an IMDb credit as a producer.

He has been building companies longer than most people his age have had jobs.`;

export const pressItems = [
  {
    publication: "Foothills Living Magazine",
    headline: "The Straus Family",
    year: "2023",
    url: null as string | null,
  },
  {
    publication: "Kent Denver Perspective",
    headline: "Mirroring Nature: Meet Digital Painter Topher Straus",
    year: "2023",
    url: null as string | null,
  },
  {
    publication: "Profile",
    headline: "Oliver Straus: Denver’s Young Entrepreneur Building AI Companies From the Ground Up",
    year: "2025",
    url: null as string | null,
  },
  {
    publication: "IMDb",
    headline: "Oliver Straus — Producer",
    year: "—",
    url: "https://imdb.com/name/nm8461530",
  },
  {
    publication: "Wikidata",
    headline: "Oliver Straus (Q140045127)",
    year: "—",
    url: "https://www.wikidata.org/wiki/Q140045127",
  },
];

export const ventures = [
  {
    name: "Topher Straus Fine Art",
    description:
      "Chief Financial Officer. Managed P&L, financial modeling, budgeting, accounts payable/receivable, and philanthropic giving for a multi-million dollar fine art enterprise across three years.",
    link: null as string | null,
    linkText: null as string | null,
  },
  {
    name: "Imperial Detailing",
    description:
      "Founder & CEO. Luxury mobile auto detailing in Denver — built a client base in one season, zero outside capital. Custom booking and CRM software written in React and Node.js.",
    link: null as string | null,
    linkText: null as string | null,
  },
  {
    name: "Defense Technology (NDA)",
    description:
      "Software Engineer. Drone-based aerial mapping and reconnaissance. UAV mission-planning pipeline — production software under NDA alongside senior defense engineers.",
    link: null as string | null,
    linkText: null as string | null,
  },
  {
    name: "Software Products",
    description:
      "10+ products shipped solo — AI life coach, autonomous computer agent, fully automated sales pipeline, developer intelligence dashboard, and more.",
    link: "https://github.com/oliverstraus246-beep" as string | null,
    linkText: "github.com/oliverstraus246-beep" as string | null,
  },
];
export const contactLinks = [
  { label: "oliverstraus246@gmail.com", href: "mailto:oliverstraus246@gmail.com" },
  { label: "x.com/OLIVER_STRAUS1", href: "https://x.com/OLIVER_STRAUS1" },
  { label: "instagram.com/oliver__straus", href: "https://instagram.com/oliver__straus" },
  { label: "linkedin.com/in/oliver-straus-06804240b", href: "https://linkedin.com/in/oliver-straus-06804240b" },
  { label: "github.com/oliverstraus246-beep", href: "https://github.com/oliverstraus246-beep" },
  { label: "imdb.com/name/nm8461530", href: "https://imdb.com/name/nm8461530" },
];




