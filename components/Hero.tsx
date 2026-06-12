"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const numeralY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const numeralOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const container = {
    hidden: {},
    visible: { transition: { delayChildren: 0.15, staggerChildren: 0.13 } },
  };
  const item = {
    hidden: shouldReduceMotion ? {} : { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
  };
  const lineVariant = {
    hidden: shouldReduceMotion ? {} : { scaleX: 0 },
    visible: { scaleX: 1, transition: { duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col justify-end pb-20 px-6 md:px-12 overflow-hidden"
      style={{ background: "var(--base)" }}
    >
      {/* Parallax background numeral */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none select-none absolute right-0 top-1/2 -translate-y-1/2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(280px, 40vw, 560px)",
          lineHeight: 1,
          color: "rgba(255,255,255,0.022)",
          fontWeight: 400,
          letterSpacing: "-0.04em",
          paddingRight: "2vw",
          y: shouldReduceMotion ? 0 : numeralY,
          opacity: shouldReduceMotion ? 1 : numeralOpacity,
        }}
        initial={shouldReduceMotion ? {} : { opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        16
      </motion.div>

      {/* Vertical left rule */}
      <motion.div
        aria-hidden="true"
        className="absolute left-6 md:left-12 top-32 bottom-20"
        style={{ width: "1px", background: "rgba(255,255,255,0.04)", transformOrigin: "top" }}
        initial={shouldReduceMotion ? {} : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="relative z-10 max-w-5xl"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Label + short line */}
        <motion.div variants={item} className="flex items-center gap-4 mb-8 ml-0">
          <span
            className="text-text-secondary uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
          >
            Oliver Straus
          </span>
          <motion.span
            variants={lineVariant}
            className="block origin-left"
            style={{ height: "1px", background: "rgba(255,255,255,0.1)", width: 40 }}
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-text-primary"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 7.5vw, 6rem)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          Built and managed
          <br />
          multi-million dollar{" "}
          <em style={{ fontStyle: "italic" }}>businesses.</em>
          <br />
          Before he could drive.
        </motion.h1>

        {/* Divider + tagline */}
        <motion.div variants={item} className="mt-10 flex items-center justify-between gap-6">
          <motion.span
            className="block origin-left"
            style={{ height: "1px", background: "rgba(255,255,255,0.08)", flex: 1, maxWidth: 120 }}
            initial={shouldReduceMotion ? {} : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.span
            className="text-text-secondary"
            style={{ fontFamily: "var(--font-body)", fontSize: "14px", letterSpacing: "0.06em" }}
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            Founder&nbsp;&nbsp;·&nbsp;&nbsp;16 years old&nbsp;&nbsp;·&nbsp;&nbsp;Denver, CO
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Scroll cue: fades in, then pulses forever */}
      <motion.span
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "#333333" }}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: [1, 0.3, 1], y: 0 }}
        transition={{
          opacity: { delay: 1.8, duration: 2, repeat: Infinity, ease: "easeInOut" },
          y: { delay: 1.8, duration: 0.5 },
        }}
      >        ↓
      </motion.span>
    </section>
  );
}

