"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Appears in the bottom-right once the visitor has scrolled ~600px down, and
// smooth-scrolls back to the top on click (instant under reduced motion --
// matching the global rule that kills smooth scroll-behavior there). Fades
// and lifts in via a CSS transition so it doesn't pop; the transition is
// neutralized under reduced motion like every other, leaving a simple
// on/off toggle. rAF-throttled so the scroll listener costs nothing at rest.
//
// Z-index sits above page content but below the nav (z-50), the menu overlay
// (z-60), and the modals/palette (z-90+), so it never covers the header or
// anything modal -- and it's `no-print` so it can't land on a printed résumé.
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setVisible(window.scrollY > 600);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
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
    <button
      type="button"
      onClick={() =>
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })
      }
      aria-label="Back to top"
      // Removed from the tab order when hidden so a keyboard user isn't
      // tabbing to an invisible control; restored the moment it appears.
      tabIndex={visible ? 0 : -1}
      className={`no-print fixed bottom-6 right-6 z-[30] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground backdrop-blur-md transition-all duration-300 ease-out hover:border-accent-blue hover:text-accent-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="stroke-current stroke-width-[1.75]"
      >
        <path
          d="M12 19V5M5 12l7-7 7 7"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}