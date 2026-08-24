"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Wraps a template.tsx boundary -- remounts on navigation (Next's template
 * convention), so this fires the entrance tween fresh on every route/segment
 * change instead of relying on scroll position like ScrollReveal.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ref.current,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out" },
      );
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
