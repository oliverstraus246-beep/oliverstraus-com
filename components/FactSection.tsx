"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

type Fact = { value: string; label: string };

export default function FactSection({
  label,
  paragraphs,
  facts,
  statement,
}: {
  label: string;
  paragraphs: string[];
  facts?: Fact[];
  statement?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduced = useReducedMotion();

  return (
    <section className="px-6 md:px-12 pb-32" style={{ background: "var(--base)" }}>
      <div ref={ref} className="max-w-5xl mx-auto">
        <motion.div
          className="flex items-center gap-4 mb-14"
          initial={reduced ? {} : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="text-text-secondary uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}>
            {label}
          </span>
          <motion.span
            className="block flex-1 origin-left"
            style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
            initial={reduced ? {} : { scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        <div className="flex flex-col md:flex-row md:gap-20">
          <div className="flex-1 max-w-2xl space-y-6">
            {paragraphs.map((para, i) => (
              <motion.p
                key={i}
                className="text-text-secondary"
                style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: 1.85 }}
                initial={reduced ? {} : { opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                {para}
              </motion.p>
            ))}
            {statement && (
              <motion.p
                className="text-text-primary pt-4"
                style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(1.2rem, 2vw, 1.5rem)", lineHeight: 1.4 }}
                initial={reduced ? {} : { opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                {statement}
              </motion.p>
            )}
          </div>

          {facts && (
            <div className="shrink-0 mt-12 md:mt-0 flex md:flex-col gap-10 md:gap-12 md:w-44">
              {facts.map((f, i) => (
                <motion.div
                  key={f.label}
                  className="flex flex-col gap-2"
                  initial={reduced ? {} : { opacity: 0, y: 14 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="text-text-primary tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 400, lineHeight: 1 }}>
                    {f.value}
                  </span>
                  <span className="text-text-secondary uppercase" style={{ fontFamily: "var(--font-body)", fontSize: "10px", letterSpacing: "0.15em" }}>
                    {f.label}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
