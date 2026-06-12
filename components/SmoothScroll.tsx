"use client";

import { useEffect } from "react";

export default function SmoothScroll() {
  useEffect(() => {
    let rafId: number;
    let destroy: (() => void) | undefined;

    import("lenis").then(({ default: Lenis }) => {
      const lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        touchMultiplier: 1.5,
      });

      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
      destroy = () => lenis.destroy();
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (destroy) destroy();
    };
  }, []);

  return null;
}
