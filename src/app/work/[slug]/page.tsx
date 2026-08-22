import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VENTURES, getVenture } from "@/lib/ventures";

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
  return {
    title: `${venture.name} — Oliver Straus`,
    description: venture.description,
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
  const next = VENTURES[(index + 1) % VENTURES.length]!;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-32 pt-32 sm:pt-40">
      <Link
        href="/#work"
        className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
      >
        &larr; Work
      </Link>

      <div className="mt-8 flex items-baseline justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {venture.role}
        </p>
        <div className="flex items-baseline gap-4">
          {venture.timeframe && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {venture.timeframe}
            </p>
          )}
          <p className="font-mono text-[11px] text-muted-foreground">
            {String(index + 1).padStart(2, "0")} / {String(VENTURES.length).padStart(2, "0")}
          </p>
        </div>
      </div>

      <h1 className="text-balance mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
        {venture.name}
      </h1>

      <p className="text-pretty mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        {venture.description}
      </p>

      {venture.highlights && venture.highlights.length > 0 && (
        <ul className="mt-10 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {venture.highlights.map((item) => (
            <li
              key={item}
              className="text-pretty flex gap-2.5 text-sm leading-relaxed text-foreground/80"
            >
              <span
                aria-hidden="true"
                className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-accent-blue"
              />
              {item}
            </li>
          ))}
        </ul>
      )}

      {venture.body && venture.body.length > 0 && (
        <article className="mt-10 max-w-2xl border-t border-border pt-8">
          {venture.body.map((paragraph) => (
            <p
              key={paragraph}
              className="text-pretty mt-5 text-base leading-relaxed text-foreground/80 first:mt-0"
            >
              {paragraph}
            </p>
          ))}
        </article>
      )}

      {((venture.stack && venture.stack.length > 0) || venture.github) && (
        <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-border pt-8">
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
          {venture.github && (
            <a
              href={venture.github}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
            >
              View on GitHub &rarr;
            </a>
          )}
        </div>
      )}

      <Link
        href={`/work/${next.slug}`}
        className="group mt-16 flex items-center justify-between border-t border-border pt-8 transition-colors hover:border-accent-blue/40"
      >
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Next
          </p>
          <p className="text-balance mt-1 text-xl font-bold tracking-tight">{next.name}</p>
        </div>
        <span
          aria-hidden="true"
          className="font-mono text-xl text-muted-foreground transition-colors group-hover:text-accent-blue"
        >
          &rarr;
        </span>
      </Link>
    </main>
  );
}
