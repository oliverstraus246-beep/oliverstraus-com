"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

function CharReveal({
  char,
  index,
  p,
}: {
  char: string;
  index: number;
  p: MotionValue<number>;
}) {
  const start = 0.02 + index * 0.018;
  const end = start + 0.19;
  const y = useTransform(p, [start, end], ["110%", "0%"]);

  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        lineHeight: 0.92,
        verticalAlign: "top",
      }}
    >
      <motion.span
        style={{ display: "inline-block", y, willChange: "transform" }}
      >
        {char === " " ? " " : char}
      </motion.span>
    </span>
  );
}

export default function KineticTitle({
  word,
  rest,
  accentColor = "var(--accent)",
}: {
  word: string;
  rest: string;
  accentColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const p = useSpring(scrollYProgress, {
    stiffness: 52,
    damping: 18,
    restDelta: 0.001,
  });

  const chars = word.split("");

  const orbOpacity = useTransform(p, [0, 0.14, 0.66, 0.82], [0, 0.22, 0.22, 0]);
  const orbScale = useTransform(p, [0, 0.45, 1], [0.55, 1.08, 1.5]);

  const wordX = useTransform(p, [0, 1], ["2%", "-3%"]);

  const ruleScaleX = useTransform(p, [0.3, 0.54], [0, 1]);
  const ruleOpacity = useTransform(p, [0.28, 0.42, 0.7, 0.82], [0, 1, 1, 0]);

  const restOpacity = useTransform(p, [0.38, 0.56], [0, 1]);
  const restY = useTransform(p, [0.38, 0.56], [22, 0]);

  const sectionY = useTransform(p, [0.75, 0.94], ["0%", "-6%"]);
  const sectionOpacity = useTransform(p, [0.75, 0.94], [1, 0]);

  if (reduced) {
    return (
      <section
        className="px-6 md:px-12 py-24"
        style={{ background: "var(--base)" }}
      >
        <h2
          className="max-w-5xl mx-auto text-text-primary"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(4.5rem, 15vw, 14rem)",
            fontWeight: 400,
            lineHeight: 0.92,
          }}
        >
          {word}
        </h2>
        <em
          style={{
            fontStyle: "italic",
            color: "var(--text-secondary)",
            fontSize: "clamp(1.5rem, 3vw, 2.6rem)",
            display: "block",
            maxWidth: "60rem",
            margin: "1rem 0 0",
          }}
        >
          {rest}
        </em>
      </section>
    );
  }

  return (
    <div ref={containerRef} style={{ height: "270vh" }}>
      <motion.div
        className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden"
        style={{
          background: "var(--base)",
          y: sectionY,
          opacity: sectionOpacity,
        }}
      >
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            opacity: orbOpacity,
            scale: orbScale,
            background: `radial-gradient(ellipse 52% 38% at 48% 54%, ${accentColor}, transparent)`,
          }}
        />

        <div className="relative z-10 px-6 md:px-12 max-w-5xl mx-auto w-full">
          <motion.h2
            aria-label={word}
            style={{
              x: wordX,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(4.5rem, 15vw, 14rem)",
              fontWeight: 400,
              letterSpacing: "-0.03em",
              lineHeight: 0.92,
              willChange: "transform",
              display: "block",
            }}
          >
            {chars.map((char, i) => (
              <CharReveal key={i} char={char} index={i} p={p} />
            ))}
          </motion.h2>

          <motion.div
            aria-hidden="true"
            className="origin-left"
            style={{
              height: "1px",
              background: `linear-gradient(to right, ${accentColor}88, transparent)`,
              marginTop: "clamp(0.6rem, 1.5vw, 1rem)",
              scaleX: ruleScaleX,
              opacity: ruleOpacity,
              willChange: "transform",
            }}
          />

          <motion.p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.4rem, 2.8vw, 2.4rem)",
              color: "var(--text-secondary)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              marginTop: "clamp(0.5rem, 1.5vw, 1rem)",
              opacity: restOpacity,
              y: restY,
              willChange: "transform, opacity",
            }}
          >
            {rest}
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
