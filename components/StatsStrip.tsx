"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

function CountUp({
  target,
  prefix = "",
  suffix = "",
  duration = 1800,
  active,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  active: boolean;
}) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const t0 = performance.now();
    const raf = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setN(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [active, target, duration]);
  return (
    <>
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </>
  );
}

type StatItem =
  | { countUp: true; target: number; prefix: string; suffix: string; label: string }
  | { countUp: false; display: string; label: string };

const statData: StatItem[] = [
  { countUp: true, target: 15, prefix: "", suffix: "+", label: "Nonprofits funded" },
  { countUp: true, target: 10, prefix: "", suffix: "+", label: "Software products built" },
  { countUp: true, target: 14, prefix: "", suffix: "", label: "Age appointed CFO" },
  { countUp: false, display: "UAV", label: "Defense systems" },
];

export default function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8%" });
  const reduced = useReducedMotion();
  const active = reduced ? true : inView;

  return (
    <section
      ref={ref}
      className="w-full px-6 md:px-12 py-24"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4">
        {statData.map((s, i) => (
          <motion.div
            key={i}
            className="py-8 md:py-0 flex flex-col gap-3"
            style={{
              paddingLeft: i === 0 ? 0 : "clamp(1.5rem,3vw,3rem)",
              paddingRight: i === statData.length - 1 ? 0 : "clamp(1.5rem,3vw,3rem)",
              borderLeft:
                i === 0 || i === 2 ? "none" : "1px solid rgba(255,255,255,0.05)",
            }}
            initial={reduced ? {} : { opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="text-text-primary tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.5rem,5vw,4rem)",
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              {s.countUp ? (
                <CountUp
                  target={s.target}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  active={active}
                />
              ) : (
                s.display
              )}
            </span>
            <motion.span
              className="text-text-secondary uppercase"
              style={{ fontFamily: "var(--font-body)", fontSize: "11px", letterSpacing: "0.15em" }}
              initial={reduced ? {} : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            >
              {s.label}
            </motion.span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
