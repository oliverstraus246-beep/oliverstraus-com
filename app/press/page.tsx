import type { Metadata } from "next";
import { pressItems } from "@/lib/content";

export const metadata: Metadata = {
  title: "Oliver Straus — Press",
  description: "Press coverage and mentions of Oliver Straus.",
};

export default function PressPage() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-6 md:px-12" style={{ background: "var(--base)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:gap-24 mb-20">
          <div className="shrink-0 mb-6 md:mb-0 md:w-32">
            <span
              className="text-text-secondary uppercase tracking-[0.2em]"
              style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
            >
              Press
            </span>
          </div>
          <h1
            className="text-text-primary"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem,5vw,3.5rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            In the press.
          </h1>
        </div>

        <div className="flex flex-col" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {pressItems.map((item, i) => {
            const El = item.url ? "a" : "div";
            return (
              <El
                key={i}
                {...(item.url
                  ? { href: item.url, target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group py-8 flex items-baseline justify-between gap-6"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex flex-col gap-2">
                  <span
                    className="text-text-secondary uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-body)", fontSize: "11px", letterSpacing: "0.15em" }}
                  >
                    {item.publication}
                  </span>
                  <span
                    className="text-text-primary group-hover:text-accent transition-colors duration-200"
                    style={{ fontFamily: "var(--font-body)", fontSize: "17px" }}
                  >
                    {item.headline}
                  </span>
                </div>
                <span
                  className="text-text-secondary shrink-0"
                  style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}
                >
                  {item.year}
                </span>
              </El>
            );
          })}
        </div>

        <p
          className="mt-16 text-text-secondary"
          style={{ fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.7 }}
        >
          Press inquiries:{" "}
          <a
            href="mailto:oliverstraus246@gmail.com"
            className="text-text-primary hover:text-accent transition-colors duration-200"
          >
            oliverstraus246@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
