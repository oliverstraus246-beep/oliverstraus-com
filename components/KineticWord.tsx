"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

export default function KineticWord({ word }: { word: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [peak, setPeak] = useState(14);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Every word erupts to the same visual fullness: ~115% of viewport width.
  // offsetWidth is layout width, unaffected by the scale transform.
  useEffect(() => {
    const el = wordRef.current;
    if (!el) return;
    const measure = () => {
      const baseWidth = el.offsetWidth;
      if (baseWidth > 0) setPeak(Math.max(4, (window.innerWidth * 1.15) / baseWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isMobile]);

  // Progress runs only while the word is pinned: 0 at pin, 1 at release.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Spring-smoothed so the erupt feels directed, not jittery
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  // Act structure: arrive small -> erupt -> hold dominant -> decisive settle
  const hold = peak * 0.88;
  const scale = useTransform(smooth, [0, 0.3, 0.55, 0.82, 1], [1, peak, hold, hold, 1]);
  const opacity = useTransform(smooth, [0, 0.04], [0.4, 1]);
  const letterSpacing = useTransform(smooth, [0, 0.3], ["-0.02em", "-0.05em"]);

  const staticWord = reduced || isMobile;

  if (staticWord) {
    return (
      <div className="flex items-center justify-center py-24 overflow-hidden">
        <motion.span
          className="text-text-primary select-none"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(4rem, 16vw, 9rem)",
            fontWeight: 400,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.8 }}
        >
          {word}
        </motion.span>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: "240vh" }} aria-hidden="true">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden pointer-events-none">
        <motion.span
          ref={wordRef}
          className="text-text-primary select-none whitespace-nowrap"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 3.5vw, 3.2rem)",
            fontWeight: 400,
            lineHeight: 1,
            scale,
            opacity,
            letterSpacing,
            willChange: "transform, opacity",
          }}
        >
          {word}
        </motion.span>
      </div>
    </div>
  );
}
