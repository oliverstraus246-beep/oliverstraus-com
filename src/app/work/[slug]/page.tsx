import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VENTURES, getVenture } from "@/lib/ventures";
import { MetricRow } from "@/components/metric-row";
import { ScrollReveal } from "@/components/scroll-reveal";

export function generateStaticParams() {
  return VENTURES.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const venture = getVenture(slug);
  if (!venture) return {};
  const title = `${venture.name} — Oliver Straus`;
  // openGraph/twitter are NOT deep-merged with the root layout's values --
  // a child route's openGraph/twitter object entirely REPLACES the
  // parent's for that route, field for field. Verified against actual
  // rendered <head> output: an earlier version of this that only set
  // {title, description} silently dropped og:type, og:site_name,
  // og:locale, and downgraded twitter:card from summary_large_image to
  // plain summary. Every field the root sets has to be repeated here too.
  return {
    title,
    description: venture.description,
    openGraph: {
      title,
      description: venture.description,
      url: `https://oliverstraus.com/work/${venture.slug}`,
      siteName: "Oliver Straus",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: venture.description,
    },
  };
}

export default async function VenturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venture = getVenture(slug);
  if (!venture) notFound();

  const index = VENTURES.findIndex((v) => v.slug === slug);
  const more = [
    VENTURES[(index + 1) % VENTURES.length]!,
    VENTURES[(index + 2) % VENTURES.length]!,
  ];

  // Per-venture structured data -- the root layout's Person schema covers
  // every page site-wide, but search engines get no project-level detail
  // for any individual venture without this. No CSP nonce needed, same
  // reasoning as the Person block: static data a crawler reads from raw
  // HTML, never executed as script.
  const ventureJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: venture.name,
    description: venture.description,
    url: `https://oliverstraus.com/work/${venture.slug}`,
    creator: {
      "@type": "Person",
      name: "Oliver Straus",
      url: "https://oliverstraus.com",
    },
    ...(venture.timeframe ? { temporalCoverage: venture.timeframe } : {}),
    ...(venture.stack && venture.stack.length > 0
      ? { keywords: venture.stack.join(", ") }
      : {}),
  };

  return (
    <main className="mx-auto max-w-5xl px-6 pb-32 pt-32 sm:pt-40">
      <script type="application/ld+json">{JSON.stringify(ventureJsonLd)}</script>
      <Link
        href="/#work"
        className="group animate-fade-up inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-1">
          &larr;
        </span>
        Work
      </Link>

      <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:mt-10 lg:grid-cols-[1fr_260px]">
        {/* Main column */}
        <div className="min-w-0">
          <h1
            className="text-balance animate-fade-up mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:mt-0"
            style={{ animationDelay: "60ms" }}
          >
            {venture.name}
          </h1>

          <p
            className="text-pretty animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            {venture.description}
          </p>

          {venture.metrics && venture.metrics.length > 0 && (
            <div className="mt-12 border-t border-border pt-10">
              <MetricRow metrics={venture.metrics} />
            </div>
          )}

          {venture.highlights && venture.highlights.length > 0 && (
            <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-border pt-10 sm:grid-cols-2">
              {venture.highlights.map((item, i) => (
                <li
                  key={item}
                  className="text-pretty flex gap-3 text-sm leading-relaxed text-foreground/80"
                >
                  <span
                    aria-hidden="true"
                    className="shrink-0 font-mono text-xs text-accent-blue"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}

          {venture.caseStudy ? (
            <ScrollReveal className="mt-12 grid grid-cols-1 gap-10 border-t border-border pt-10 sm:grid-cols-3">
              {(
                [
                  ["Problem", venture.caseStudy.problem],
                  ["Approach", venture.caseStudy.approach],
                  ["Outcome", venture.caseStudy.outcome],
                ] as const
              ).map(([label, text]) => (
                <div key={label}>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-accent-blue">
                    {label}
                  </p>
                  <p className="text-pretty mt-3 text-sm leading-relaxed text-foreground/80">
                    {text}
                  </p>
                </div>
              ))}
            </ScrollReveal>
          ) : (
            venture.body &&
            venture.body.length > 0 && (
              <ScrollReveal className="mt-12 border-t border-border pt-10">
                {venture.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-pretty mt-5 text-base leading-relaxed text-foreground/80 first:mt-0"
                  >
                    {paragraph}
                  </p>
                ))}
              </ScrollReveal>
            )
          )}
        </div>

        {/* Facts sidebar */}
        <aside className="animate-fade-up flex flex-col gap-8 lg:sticky lg:top-32 lg:self-start" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-start lg:gap-1">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {venture.role}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {String(index + 1).padStart(2, "0")} / {String(VENTURES.length).padStart(2, "0")}
              {venture.timeframe ? ` · ${venture.timeframe}` : ""}
            </p>
          </div>

          {venture.stack && venture.stack.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Stack
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {venture.stack.map((tech) => (
                  <span
                    key={tech}
                    className="border border-border px-2.5 py-1 font-mono text-xs text-foreground/80"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {venture.repoUrl && (
            <a
              href={venture.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
            >
              View on GitLab &rarr;
            </a>
          )}
        </aside>
      </div>

      <div className="mt-16 border-t border-border pt-10">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          More ventures
        </p>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {more.map((venture) => (
            <Link
              key={venture.slug}
              href={`/work/${venture.slug}`}
              className="group flex items-center justify-between border border-border p-6 transition-colors hover:border-accent-blue/40"
            >
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {venture.role}
                </p>
                <p className="text-balance mt-1 text-xl font-bold tracking-tight">
                  {venture.name}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="ml-4 shrink-0 font-mono text-xl text-muted-foreground transition-[color,transform] duration-300 group-hover:translate-x-1 group-hover:text-accent-blue"
              >
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
