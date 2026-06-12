import type { Metadata } from "next";
import Image from "next/image";
import { bioFull } from "@/lib/content";
import { ventures } from "@/lib/content";

export const metadata: Metadata = {
  title: "Oliver Straus — About",
  description:
    "Oliver Straus is a 16-year-old founder and operator. CEO of Topher Straus Fine Art, founder of Imperial Detail, defense tech contractor, and software builder.",
};

export default function AboutPage() {
  return (
    <div
      className="min-h-screen pt-32 pb-24 px-6 md:px-12"
      style={{ background: "var(--base)" }}
    >
      <div className="max-w-5xl mx-auto">

        {/* Portrait: grayscale, editorial, sits inside the monochrome system */}
        <div
          className="relative w-full overflow-hidden mb-20"
          style={{ height: "clamp(320px, 55vh, 560px)", background: "#111111" }}
        >
          <Image
            src="/oliver.jpg"
            alt="Oliver Straus"
            fill
            className="object-cover"
            style={{ objectPosition: "center 28%", filter: "grayscale(1) contrast(1.05) brightness(0.9)" }}
            priority
          />
        </div>

        {/* Pull quote */}
        <div className="mb-20" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: "clamp(1.5rem, 3vw, 3rem)" }}>
          <blockquote
            className="text-text-primary"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            "He chose to build instead of wait."
          </blockquote>
        </div>

        {/* Two column: label | body */}
        <div className="flex flex-col md:flex-row md:gap-24 mb-20">
          <div className="shrink-0 mb-8 md:mb-0 md:w-32">
            <span
              className="text-text-secondary uppercase tracking-[0.2em]"
              style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
            >
              Oliver Straus
            </span>
          </div>
          <div className="flex-1 max-w-2xl space-y-5">
            {bioFull.split("\n\n").map((para, i) => (
              <p
                key={i}
                className="text-text-secondary"
                style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: 1.85 }}
              >
                {para.trim()}
              </p>
            ))}
          </div>
        </div>

        {/* Ventures — expanded */}
        <div
          className="pt-16"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-4 mb-14">
            <span
              className="text-text-secondary uppercase tracking-[0.2em]"
              style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
            >
              Ventures
            </span>
            <span className="block flex-1" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
          </div>

          <div className="flex flex-col">
            {ventures.map((v, i) => (
              <div
                key={v.name}
                className="py-8 flex flex-col md:flex-row md:items-baseline md:gap-8"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span
                  className="text-text-secondary mb-2 md:mb-0 shrink-0"
                  style={{ fontFamily: "var(--font-body)", fontSize: "11px", letterSpacing: "0.15em", minWidth: "2.5rem" }}
                >
                  0{i + 1}
                </span>
                <div className="flex flex-col md:flex-row md:items-baseline md:gap-8 flex-1">
                  <span
                    className="text-text-primary mb-2 md:mb-0 shrink-0"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.25rem",
                      fontWeight: 400,
                      minWidth: "clamp(180px, 22vw, 280px)",
                    }}
                  >
                    {v.name}
                  </span>
                  <p
                    className="text-text-secondary"
                    style={{ fontFamily: "var(--font-body)", fontSize: "15px", lineHeight: 1.7 }}
                  >
                    {v.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IMDb credit */}
        <div
          className="mt-16 pt-10 flex flex-col md:flex-row md:gap-24"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="shrink-0 mb-4 md:mb-0 md:w-32">
            <span
              className="text-text-secondary uppercase tracking-[0.2em]"
              style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
            >
              IMDb
            </span>
          </div>
          <a
            href="https://imdb.com/name/nm8461530"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-primary hover:text-accent transition-colors duration-200"
            style={{ fontFamily: "var(--font-body)", fontSize: "15px" }}
          >
            imdb.com/name/nm8461530
          </a>
        </div>
      </div>
    </div>
  );
}


