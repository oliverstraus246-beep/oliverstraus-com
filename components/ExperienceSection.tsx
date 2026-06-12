"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const items = [
  {
    name: "Topher Straus Fine Art",
    body: "CEO. Multi-million dollar fine art business. $250K+ donated to charity. Running a real company at scale while in high school.",
  },
  {
    name: "Defense / UAV Contracting",
    body: "Contracted for companies building unmanned aerial vehicles and military systems.",
  },
];

export default function ExperienceSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduced = useReducedMotion();

  return (
    <section className="px-6 md:px-12 pb-28" style={{ background: "var(--base)" }}>
      <div ref={ref} className="max-w-5xl mx-auto">
        <motion.div
          className="flex items-center gap-4 mb-16"
          initial={reduced ? {} : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="text-text-secondary uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}>
            Experience
          </span>
          <motion.span
            className="block flex-1 origin-left"
            style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
            initial={reduced ? {} : { scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
          {items.map((item, i) => (
            <motion.div
              key={item.name}
              initial={reduced ? {} : { opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3
                className="text-text-primary mb-4"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 2.5vw, 1.8rem)", fontWeight: 400, letterSpacing: "-0.01em" }}
              >
                {item.name}
              </h3>
              <p className="text-text-secondary" style={{ fontFamily: "var(--font-body)", fontSize: "15px", lineHeight: 1.8 }}>
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
