"use client";

import { useEffect, useRef } from "react";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// A subtle "Scroll" indicator at the bottom of the hero. Fades out over the
// first ~180px of scroll so it's gone the moment the user actually starts
// scrolling (the hero is scroll-pinned, so window.scrollY advances during the
// crossfade -- the cue vanishes right as that begins, never lingering while
// you're actively scrolling). rAF-throttled. Hidden entirely under reduced
// motion (motion-reduce:hidden) -- no motion hint needed when motion is
// suppressed, and scrolling still works.
export function ScrollCue() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const opacity = Math.max(0, 1 - window.scrollY / 180);
      el.style.opacity = String(opacity);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="no-print motion-reduce:hidden pointer-events-none absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Scroll
      </span>
      <span className="relative h-9 w-px overflow-hidden bg-border">
        <span className="animate-scroll-cue absolute inset-x-0 top-0 h-3 bg-accent-blue" />
      </span>
    </div>
  );
}