"use client";

import { useEffect } from "react";

// This site has scroll-pinned sections (the hero's headline crossfade).
// Browsers restore the previous scroll position on reload by default
// (history.scrollRestoration = "auto"), which for a normal page is a
// helpful convenience -- but here it means a reload can land mid-way
// through a pinned animation, or on a totally different section, which
// reads as broken rather than convenient.
//
// Setting scrollRestoration to "manual" and calling scrollTo(0, 0) once
// on mount is not enough: verified directly that the browser's own
// restore re-applies the exact same scroll position afterward, on some
// internal timing tied to layout/paint settling that isn't reliably
// reachable from a single mount effect, a requestAnimationFrame, or a
// window "load" listener (load has frequently already fired by the time
// this component mounts, so that listener never runs). Polling for a
// short window after mount is the one approach that reliably wins:
// whenever the browser's restore actually happens, the next poll tick
// overrides it.
const POLL_INTERVAL_MS = 50;
const POLL_DURATION_MS = 1000;

export function ScrollReset() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);
    const interval = setInterval(() => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    }, POLL_INTERVAL_MS);
    const stop = setTimeout(() => clearInterval(interval), POLL_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, []);

  return null;
}
