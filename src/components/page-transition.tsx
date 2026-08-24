"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Wraps a template.tsx boundary -- remounts on navigation (Next's template
 * convention), so this fires the entrance tween fresh on every route/segment
 * change instead of relying on scroll position like ScrollReveal.
 *
 * Opacity only, deliberately no `y`/transform tween here. This wrapper is an
 * ancestor of every page's content, including Hero's `position: fixed`
 * ScrollTrigger pin (its scroll-pinned headline crossfade). Per the CSS
 * spec, ANY non-`none` transform on an ancestor creates a new containing
 * block for `position: fixed` descendants -- a `y` slide-in here made Hero
 * pin itself against THIS div instead of the real viewport, so pinned
 * content scrolled away with the page while its spacer still reserved the
 * scroll distance, leaving a large blank gap. Clearing the transform after
 * the tween wasn't enough either -- ScrollTrigger's own repin/refresh cycle
 * re-touches this element's transform later, at which point the same
 * containing-block bug recurs. Opacity never creates a containing block, so
 * dropping `y` removes the failure mode entirely rather than racing it.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ref.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.4, ease: "power2.out" },
      );
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
