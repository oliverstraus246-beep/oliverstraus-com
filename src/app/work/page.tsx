import Link from "next/link";
import type { Metadata } from "next";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Reveal } from "@/components/reveal";
import { SpotlightCard } from "@/components/spotlight-card";
import { VENTURES } from "@/lib/ventures";

// A crawlable hub for the venture detail pages. The homepage's #work section
// shows the same cards, but as an in-page anchor -- so /work itself was a
// 404 (nothing in the nav points here; "Work" links to /#work for the
// smooth-scroll). That left a dead route for anyone who typed the path or
// for crawlers that infer it from the /work/[slug] URL prefix. This page
// gives the prefix a real index: one h1, every venture as an h2 link, and
// an ItemList schema so search engines see the ventures as a group rather
// than inferring it. The nav link stays on /#work so the homepage's
// smooth-scroll UX is unchanged -- this just backstops the route.

const FULL_TITLE = "Work | Oliver Straus";
const DESCRIPTION = `Selected ventures Oliver Straus has built, run, or led solo, from CFO appointments to security tooling and AI agent systems.`;

export const metadata: Metadata = {
  title: "Work",
  description: DESCRIPTION,
  alternates: { canonical: "/work" },
  // openGraph/twitter are NOT deep-merged with the root layout's values --
  // a child route's object entirely REPLACES the parent's, field for field,
  // so every field the root sets has to be repeated here too (verified
  // against rendered <head> output on the venture pages).
  openGraph: {
    title: FULL_TITLE,
    description: DESCRIPTION,
    url: "https://oliverstraus.com/work",
    siteName: "Oliver Straus",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: FULL_TITLE,
    description: DESCRIPTION,
  },
};

export default function WorkIndexPage() {
  // ItemList of the ventures -- the venture detail pages each emit their
  // own CreativeWork schema, but without this the collection itself is
  // invisible to crawlers. Same static-data reasoning as those pages: read
  // from raw HTML, never executed as script, so no CSP nonce needed.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Selected Work by Oliver Straus",
    itemListElement: VENTURES.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: v.name,
      url: `https://oliverstraus.com/work/${v.slug}`,
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pb-32 pt-32 sm:pt-40">
      <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>

      <Link
        href="/#work"
        // py-1.5 -my-1.5 enlarges the tap target to ~28px (WCAG 2.2 AA 24px
        // minimum) with the negative margin cancelling the box growth so
        // the link's visual position is unchanged.
        className="group animate-fade-up inline-flex items-center gap-1.5 py-1.5 -my-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-1">
          &larr;
        </span>
        Home
      </Link>

      <Reveal as="div" className="mt-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          02 / Work
        </p>
        <h1 className="text-balance mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          {VENTURES.length} ventures. Built, run, or led solo.
        </h1>
        <p className="text-pretty mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          A chronological look at the companies, tools, and systems. Each one
          links to the full breakdown.
        </p>
      </Reveal>

      <ScrollReveal className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
        {VENTURES.map((venture, i) => (
          <SpotlightCard
            key={venture.slug}
            href={`/work/${venture.slug}`}
            // p-5 sm:p-8 matches the homepage VentureGrid so the /work index
            // and the homepage #work section read as one design, not two --
            // an earlier version used p-8 on every viewport, which on a 390px
            // phone left only ~282px of content width inside 32px of padding
            // per side (the dense, over-padded "cluttered" feel on mobile).
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:shadow-[0_0_24px_-14px_var(--accent-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-border transition-colors duration-300 group-hover:bg-accent-blue/40" />
            <div className="relative z-[2] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {venture.role}
                </p>
                <h2 className="text-balance mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                  {venture.name}
                </h2>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")} / {String(VENTURES.length).padStart(2, "0")}
              </span>
            </div>
            <p className="text-pretty relative z-[2] mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4">
              {venture.description}
            </p>
            {venture.stack && venture.stack.length > 0 && (
              <div className="relative z-[2] mt-4 flex flex-wrap items-center gap-1.5 sm:mt-5">
                {venture.stack.slice(0, 3).map((tech) => (
                  <span
                    key={tech}
                    className="border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {tech}
                  </span>
                ))}
                {venture.stack.length > 3 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    +{venture.stack.length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="relative z-[2] mt-5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-accent-blue transition-colors duration-300 sm:mt-6">
              View details
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </div>
          </SpotlightCard>
        ))}
      </ScrollReveal>
    </main>
  );
}