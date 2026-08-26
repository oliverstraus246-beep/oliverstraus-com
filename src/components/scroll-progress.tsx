"use client";

import { useEffect, useRef } from "react";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// A thin accent bar pinned to the top of the viewport whose width tracks page
// scroll progress -- the clearest "scroll-based" signal site-wide. rAF-
// throttled scroll listener (not a CSS animation), so it costs nothing when
// the page is still. Hidden under reduced motion (the bar would still work,
// but a static indicator isn't worth the motion budget; we just hide it).
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const bar = barRef.current;
    if (!bar) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const scrollTop = window.scrollY;
      const height =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? Math.min(scrollTop / height, 1) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="no-print pointer-events-none fixed inset-x-0 top-0 z-[150] h-[2px] bg-transparent"
    >
      <div
        ref={barRef}
        className="h-full origin-left bg-accent-blue"
        style={{ transform: "scaleX(0)", willChange: "transform" }}
      />
    </div>
  );
}