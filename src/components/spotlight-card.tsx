"use client";

import { useRef, type ReactNode, type MouseEvent, type Ref } from "react";
import Link from "next/link";

/**
 * Wraps a card and adds a radial glow that tracks the cursor -- a scanner
 * sweeping the surface, on-brand for the security aesthetic -- plus a
 * subtle perspective tilt toward the cursor. CSS custom properties updated
 * on mousemove, consumed by a ::before radial-gradient and a transform
 * defined in globals.css (.spotlight-card). Tilt is deliberately small
 * (+/-5deg max) -- this site already walked back gimmicky motion once,
 * restrained is the bar, not a return trip.
 *
 * Renders a real <Link> when given href (proper navigation semantics --
 * cmd/ctrl-click, "open in new tab", crawlable), or a plain div otherwise.
 */
const MAX_TILT_DEG = 5;

export function SpotlightCard({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  const ref = useRef<HTMLDivElement | HTMLAnchorElement>(null);

  function handleMove(e: MouseEvent<HTMLDivElement | HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--spot-x", `${x}px`);
    el.style.setProperty("--spot-y", `${y}px`);
    const tiltX = ((y / rect.height) - 0.5) * -2 * MAX_TILT_DEG;
    const tiltY = ((x / rect.width) - 0.5) * 2 * MAX_TILT_DEG;
    el.style.setProperty("--tilt-x", `${tiltX}deg`);
    el.style.setProperty("--tilt-y", `${tiltY}deg`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }

  if (href) {
    return (
      <Link
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={`spotlight-card block ${className}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`spotlight-card ${className}`}
    >
      {children}
    </div>
  );
}
