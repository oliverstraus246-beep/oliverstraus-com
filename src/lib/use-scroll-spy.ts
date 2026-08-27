"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which section id currently occupies the top band of the viewport and
 * returns it, so the desktop nav can mark the matching link active. Uses a
 * single IntersectionObserver with a top-biased rootMargin so the active
 * section is the one crossing ~30% from the top -- the spot a reader's eye
 * lands on -- rather than whatever is centered, which reads as laggy on a
 * page with tall sections.
 *
 * Returns `undefined` until any tracked section has entered the band (e.g. while
 * the scroll-pinned hero still owns the viewport), so no link is falsely
 * highlighted at the very top of the page.
 *
 * The `ids` dependency is joined into a string so a caller passing a fresh
 * array literal each render doesn't re-run the effect every time.
 */
export function useScrollSpy(ids: string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(undefined);
  const key = ids.join(",");

  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (list.length === 0) return;

    const ratios = new Map<string, number>();
    let best: string | undefined;

    function recompute() {
      let next: string | undefined;
      let nextRatio = 0;
      // Tie-break toward the later section: when two sections share the band
      // during a scroll transition, the one nearer the bottom of the list is
      // the one the reader is entering, so it should win.
      for (const id of list) {
        const r = ratios.get(id) ?? 0;
        if (r >= nextRatio && r > 0) {
          nextRatio = r;
          next = id;
        }
      }
      if (next && next !== best) {
        best = next;
        setActive(next);
      } else if (!next && best) {
        best = undefined;
        setActive(undefined);
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!list.includes(id)) continue;
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        recompute();
      },
      // Top 30% band: ignore everything below 65% from the top so a tall
      // section doesn't stay "active" while the next one is already on screen.
      { rootMargin: "-25% 0px -65% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    for (const id of list) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [key]);

  return active;
}