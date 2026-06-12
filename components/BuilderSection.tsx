"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { defense, products } from "@/lib/content";

export default function BuilderSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8%" });
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
            Defense &amp; Software
          </span>
          <motion.span
            className="block flex-1 origin-left"
            style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
            initial={reduced ? {} : { scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        {defense.paragraphs.map((para, i) => (
          <motion.p
            key={i}
            className="text-text-secondary max-w-2xl mb-16"
            style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: 1.85 }}
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {para}
          </motion.p>
        ))}

        <div className="flex flex-col">
          {products.map((prod, i) => (
            <div key={prod.name} className="relative group">
              <motion.div
                className="absolute top-0 left-0 right-0 origin-left"
                style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
                initial={reduced ? {} : { scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.div
                className="py-8 flex flex-col md:flex-row md:items-baseline md:gap-8"
                initial={reduced ? {} : { opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.3 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
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
                    style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.1rem, 2vw, 1.35rem)", fontWeight: 400, letterSpacing: "-0.01em", minWidth: "clamp(180px, 24vw, 300px)", color: "var(--text-primary)" }}
                  >
                    {prod.name}
                  </span>
                  <span className="text-text-secondary flex-1" style={{ fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.7 }}>
                    {prod.description}
                  </span>
                  <span className="hidden lg:block text-text-secondary shrink-0 uppercase" style={{ fontFamily: "var(--font-body)", fontSize: "10px", letterSpacing: "0.12em", opacity: 0.7 }}>
                    {prod.stack}
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
            transition={{ duration: 0.7, delay: 0.25 + products.length * 0.09, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <motion.div
          className="mt-14"
          initial={reduced ? {} : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <a
            href="https://github.com/oliverstraus246"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-primary hover:text-accent transition-colors duration-200 border-b pb-px"
            style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.06em", borderColor: "rgba(255,255,255,0.15)" }}
          >
            All builds at github.com/oliverstraus246 &rarr;
          </a>
        </motion.div>
      </div>
    </section>
  );
}
