"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 1200;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Animates a formatted numeric string ("14", "$250K", "7") from 0 up to
 * its real value once scrolled into view. Parses out the leading/trailing
 * non-digit characters so the format survives the count -- "$250K" counts
 * 0 -> 250 while keeping "$" and "K" fixed in place.
 */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(\D*)$/);
    const el = ref.current;
    if (!match || !el || prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr!);
    const decimals = numStr!.includes(".") ? numStr!.split(".")[1]!.length : 0;

    // Don't snap to 0 here in the effect body -- that would flash the final
    // value (SSR/paint) -> 0 -> count-up, especially visible for above-the-
    // fold stats (the hero "At a glance" panel). Instead keep showing the
    // real value until the observer fires, then start from 0 in the same
    // tick the rAF begins -- off-screen numbers never flash, on-screen ones
    // count up once on load (a nice effect, not a flicker).
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return;
        started.current = true;
        setDisplay(`${prefix}${(0).toFixed(decimals)}${suffix}`);
        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / DURATION_MS, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
