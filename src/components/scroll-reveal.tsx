"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Cycles left / right / up so a row of items doesn't all move the same way --
// real directional motion, not a uniform fade.
const DIRECTIONS = [
  { x: -140, y: 0, rotate: -3 },
  { x: 140, y: 0, rotate: 3 },
  { x: 0, y: 140, rotate: 0 },
] as const;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Wraps a list/grid container and reveals its direct children by slamming
 * them in from alternating directions (left/right/below) as they cross into
 * view, using ScrollTrigger.batch.
 */
export function ScrollReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Reduced motion: leave items in their natural flow. The global
      // @media (prefers-reduced-motion) CSS only kills CSS transitions --
      // GSAP's rAF-driven transforms bypass it, so without this gate the
      // items would still be slammed in from +-140px with rotation. Returning
      // before gsap.set means nothing is hidden, so content is visible
      // immediately with no entrance animation.
      if (prefersReducedMotion()) return;

      const items = gsap.utils.toArray<HTMLElement>(
        Array.from(ref.current?.children ?? []),
      );
      if (items.length === 0) return;

      items.forEach((item, i) => {
        const dir = DIRECTIONS[i % DIRECTIONS.length]!;
        gsap.set(item, {
          autoAlpha: 0,
          x: dir.x,
          y: dir.y,
          rotate: dir.rotate,
        });
      });

      ScrollTrigger.batch(items, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            autoAlpha: 1,
            x: 0,
            y: 0,
            rotate: 0,
            duration: 1,
            stagger: 0.15,
            ease: "back.out(1.4)",
          }),
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
