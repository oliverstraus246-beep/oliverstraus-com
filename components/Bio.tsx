"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { bioShort } from "@/lib/content";

export default function Bio() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8%" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      className="px-6 md:px-12 py-24"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <motion.div
        ref={ref}
        className="max-w-5xl mx-auto flex flex-col md:flex-row md:gap-24"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Label pinned left */}
        <div className="shrink-0 mb-8 md:mb-0 md:w-32">
          <span
            className="text-text-secondary uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
          >
            About
          </span>
        </div>

        {/* Bio content */}
        <div className="flex-1 max-w-xl">
          <p
            className="text-text-secondary mb-8"
            style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: 1.85 }}
          >
            {bioShort}
          </p>
          <Link
            href="/contact"
            className="text-text-primary hover:text-accent transition-colors duration-200 border-b pb-px"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              letterSpacing: "0.06em",
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            Get in touch &rarr;
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
