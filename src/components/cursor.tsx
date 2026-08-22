"use client";

// Four short diagonal strokes angled toward a center that's deliberately
// left open -- an X with the middle removed, not a filled crosshair. Native
// cursor stays fully visible until this mounts and adds `custom-cursor-active`
// to <body> itself (rather than hiding native cursor unconditionally via
// CSS) so a slow hydration never leaves the page with no visible cursor at
// all. See globals.css for the `custom-cursor-active` rule and the
// `input`/`textarea` carve-out that keeps the native text-edit cursor.
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const INTERACTIVE_SELECTOR = "a, button, input, textarea, [role='button']";

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    document.body.classList.add("custom-cursor-active");
    active.current = true;

    const dot = dotRef.current!;
    const xTo = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3" });
    const yTo = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3" });

    const onMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    const onOver = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.(INTERACTIVE_SELECTOR)) {
        markRef.current?.classList.add("cursor-mark-active");
      }
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.(INTERACTIVE_SELECTOR)) {
        markRef.current?.classList.remove("cursor-mark-active");
      }
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  if (prefersReducedMotion()) return null;

  return (
    <div
      ref={dotRef}
      className="pointer-events-none fixed left-0 top-0 z-[200]"
      aria-hidden="true"
    >
      <div
        ref={markRef}
        className="cursor-mark -translate-x-1/2 -translate-y-1/2"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <line className="cursor-mark-base" x1="14.5" y1="14.5" x2="18.5" y2="18.5" />
          <line className="cursor-mark-base" x1="9.5" y1="14.5" x2="5.5" y2="18.5" />
          <line className="cursor-mark-base" x1="9.5" y1="9.5" x2="5.5" y2="5.5" />
          <line className="cursor-mark-base" x1="14.5" y1="9.5" x2="18.5" y2="5.5" />
        </svg>
      </div>
    </div>
  );
}
