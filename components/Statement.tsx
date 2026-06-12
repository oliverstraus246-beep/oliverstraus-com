"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

export default function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduced = useReducedMotion();

  return (
    <section
      className="px-6 md:px-12 py-28 md:py-40"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div ref={ref} className="max-w-5xl mx-auto">
        <motion.span
          className="block text-text-secondary uppercase tracking-[0.2em] mb-12"
          style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
          initial={reduced ? {} : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          On record
        </motion.span>

        <div className="relative">
          {/* Large background quote mark */}
          <motion.span
            aria-hidden="true"
            className="absolute -top-8 -left-4 select-none pointer-events-none"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(8rem, 18vw, 16rem)",
              lineHeight: 1,
              color: "rgba(255,255,255,0.025)",
              fontWeight: 400,
            }}
            initial={reduced ? {} : { opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 1.2, delay: 0.05 }}
          >
            &ldquo;
          </motion.span>

          <motion.blockquote
            className="relative text-text-primary"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.7rem, 3.8vw, 3.2rem)",
              fontWeight: 400,
              lineHeight: 1.22,
              letterSpacing: "-0.02em",
              maxWidth: "820px",
            }}
            initial={reduced ? {} : { opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            He operates like he&rsquo;s been doing this for thirty years. Then you remember he&rsquo;s sixteen.
          </motion.blockquote>

          <motion.div
            className="mt-10 flex items-center gap-4"
            initial={reduced ? {} : { opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            <span
              style={{
                display: "block",
                height: "1px",
                width: "32px",
                background: "rgba(255,255,255,0.12)",
              }}
            />
            <span
              className="text-text-secondary"
              style={{ fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.1em" }}
            >
              Frequently said about Oliver Straus
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


