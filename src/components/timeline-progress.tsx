"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// The timeline's left rail, drawn (scaleY 0 -> 1) as the section scrolls
// through the viewport -- a scroll-scrubbed "playhead" that reads as progress
// on a career log, on-brand for the terminal aesthetic. Sits over a faint
// static base line so the rail is visible even before/without scroll. Under
// reduced motion the accent line is shown fully drawn (no scrub), so the
// rail still reads as a connected timeline without motion.
export function TimelineProgress() {
  const lineRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) {
      if (lineRef.current) lineRef.current.style.transform = "scaleY(1)";
      return;
    }
    const line = lineRef.current;
    const track = line?.parentElement;
    if (!line || !track) return;
    gsap.fromTo(
      line,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: track,
          start: "top 70%",
          end: "bottom 80%",
          scrub: 0.5,
        },
      },
    );
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute left-0 top-0 h-full w-px -translate-x-1/2 bg-border"
    >
      <div
        ref={lineRef}
        className="h-full w-full origin-top bg-accent-blue"
        style={{ transform: "scaleY(0)", willChange: "transform" }}
      />
    </div>
  );
}