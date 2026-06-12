"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { roles } from "@/lib/content";

export default function RolesStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-4%" });
  const reduced = useReducedMotion();

  return (
    <section
      ref={ref}
      className="w-full px-6 md:px-12 py-6 overflow-hidden"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-8 gap-y-3">
        {roles.map((r, i) => (
          <motion.div
            key={r.label}
            className="flex items-baseline gap-2"
            initial={reduced ? {} : { opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="text-text-primary uppercase tracking-widest"
              style={{ fontFamily: "var(--font-body)", fontSize: "10px", letterSpacing: "0.18em" }}
            >
              {r.label}
            </span>
            <span
              className="text-text-secondary"
              style={{ fontFamily: "var(--font-body)", fontSize: "10px", letterSpacing: "0.06em" }}
            >
              {r.sub}
            </span>
            {i < roles.length - 1 && (
              <span className="text-text-secondary ml-4" style={{ fontSize: "10px", opacity: 0.3 }}>
                ·
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
