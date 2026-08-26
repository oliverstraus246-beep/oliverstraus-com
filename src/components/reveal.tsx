"use client";

import { useRef, type ElementType, type ReactNode } from "react";
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

// Scroll-linked (scrub) fade + rise. Unlike ScrollReveal's one-shot slam-in,
// this is tied to scroll position: the element eases in over a short scroll
// range as it enters, and reverses if you scroll back up -- the "scroll-based
// animation" feel Oliver asked for, kept gentle (no rotation, small y) so it
// reads as polish on headings rather than motion for its own sake. Under
// reduced motion the element is left in its natural flow (visible, no shift).
export function Reveal({
  children,
  as: Tag = "div",
  className,
  y = 28,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const el = ref.current;
      if (!el) return;
      // opacity (not autoAlpha/visibility:hidden) deliberately: visibility:hidden
      // would strip the heading out of the screen-reader accessibility tree
      // until the user scrolls it into view, so a SR user jumping by heading
      // would hit an absent node. opacity:0 keeps it in the a11y tree and
      // readable -- the motion is purely visual decoration.
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            end: "top 68%",
            scrub: 0.6,
          },
        },
      );
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}