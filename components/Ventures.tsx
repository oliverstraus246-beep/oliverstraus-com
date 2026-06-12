"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ventures } from "@/lib/content";

export default function Ventures() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6%" });
  const reduced = useReducedMotion();

  return (
    <section className="px-6 md:px-12 py-24" style={{ background: "var(--base)" }}>
      <div ref={ref} className="max-w-5xl mx-auto">
        <motion.div
          className="flex items-center gap-4 mb-16"
          initial={reduced ? {} : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="text-text-secondary uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}>
            Ventures
          </span>
          <motion.span
            className="block flex-1 origin-left"
            style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
            initial={reduced ? {} : { scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        <div className="flex flex-col">
          {ventures.map((v, i) => (
            <div key={v.name} className="relative group">
              <motion.div
                className="absolute top-0 left-0 right-0 origin-left"
                style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
                initial={reduced ? {} : { scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.div
                className="py-8 flex flex-col md:flex-row md:items-baseline md:gap-8"
                initial={reduced ? {} : { opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.2 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className="mb-3 md:mb-0 shrink-0 transition-colors duration-300 group-hover:text-accent"
                  style={{ fontFamily: "var(--font-body)", fontSize: "11px", letterSpacing: "0.15em", minWidth: "2.5rem", color: "var(--text-secondary)" }}
                >
                  0{i + 1}
                </span>
                <div className="flex flex-col md:flex-row md:items-baseline md:gap-8 flex-1">
                  <span
                    className="mb-2 md:mb-0 shrink-0 transition-colors duration-300 group-hover:text-accent"
                    style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.1rem, 2vw, 1.35rem)", fontWeight: 400, letterSpacing: "-0.01em", minWidth: "clamp(180px, 22vw, 280px)", color: "var(--text-primary)" }}
                  >
                    {v.name}
                  </span>
                  <span className="text-text-secondary" style={{ fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.7 }}>
                    {v.description}
                    {v.link && (
                      <>
                        {" "}
                        <a
                          href={v.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-secondary hover:text-text-primary transition-colors duration-150 underline underline-offset-2"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          {v.linkText}
                        </a>
                      </>
                    )}
                  </span>
                </div>
              </motion.div>
            </div>
          ))}
          <motion.div
            className="origin-left"
            style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
            initial={reduced ? {} : { scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.15 + ventures.length * 0.09, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </section>
  );
}
