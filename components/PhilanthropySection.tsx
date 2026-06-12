"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

function CountUpDollars({ active }: { active: boolean }) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const t0 = performance.now();
    const raf = (now: number) => {
      const p = Math.min((now - t0) / 2000, 1);
      setN(Math.round((1 - Math.pow(1 - p, 4)) * 250000));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [active]);
  return <>${n.toLocaleString()}+</>;
}

export default function PhilanthropySection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reduced = useReducedMotion();

  return (
    <section className="px-6 md:px-12 pb-32" style={{ background: "var(--base)" }}>
      <div ref={ref} className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="block text-text-primary tabular-nums"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(4rem, 9vw, 8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            <CountUpDollars active={reduced ? true : inView} />
          </span>
          <span
            className="block mt-6 text-text-secondary"
            style={{ fontFamily: "var(--font-body)", fontSize: "15px", letterSpacing: "0.04em" }}
          >
            Donated to charity through Topher Straus Fine Art.
          </span>
        </motion.div>

        <motion.p
          className="mx-auto mt-14 text-text-secondary"
          style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: 1.8, maxWidth: "420px" }}
          initial={reduced ? {} : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          Giving is part of the model, not an afterthought.
        </motion.p>
      </div>
    </section>
  );
}
