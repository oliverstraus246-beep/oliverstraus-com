"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CountUp } from "@/components/count-up";
import { openResume } from "@/components/resume-modal";
import { ScrollCue } from "@/components/scroll-cue";
import { STATS } from "@/lib/stats";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HEADLINES = [
  "Appointed CFO\nat fourteen.",
  "The actual books.\nThe actual payroll.",
  "Builds alone.\nVerifies always.",
  "Chose building\nover waiting.",
];

// Every headline's crossfade visibility (autoAlpha/opacity) is set by GSAP
// via useGSAP below -- but that only ever runs if hydration succeeds.
// Reported live: on devices where it doesn't (JS never executes), every
// headline rendered at its raw un-styled-by-JS state, all `absolute
// inset-0` on top of each other -- four taglines visibly overlapping,
// unreadable. `opacity-0 first:opacity-100` on both the mobile <h1>s and
// the desktop wrapper divs below is a pure-CSS baseline: only the first
// headline shows with zero JS involvement. When GSAP does run, its inline
// styles set on mount override these classes immediately (inline always
// wins over a class), so this changes nothing for the working case.

// Desktop only: each headline claims a different corner instead of
// crossfading in the exact same spot. Kept out of the flex row entirely
// (see the section-level absolute layer below) after an earlier version
// nested this inside the flex text column with an explicit sm:h-[60vh]
// wrapper to have room to spread into -- that fed real document-flow
// height into the row GSAP's ScrollTrigger pins against, and broke the
// pin's scroll math badly enough that the page loaded scrolled to the
// Contact section instead of the hero. This version positions each
// headline absolutely against the section itself (stable h-screen,
// doesn't grow with content), so nothing here can ever feed height back
// into the pinned layout again.
//
// Positions follow Oliver's literal spec: left, a little below that,
// right (further right than the first two sit left), then down at the
// bottom -- a diagonal drift rather than four discrete corners.
const DESKTOP_POSITION = [
  "sm:top-[32%] sm:left-6",
  "sm:top-[52%] sm:left-6",
  "sm:top-[42%] sm:right-6 sm:text-right",
  "sm:bottom-16 sm:left-1/2 sm:-translate-x-1/2 sm:text-center",
];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Hero() {
  const container = useRef<HTMLElement>(null);
  const mobileLineRefs = useRef<Array<HTMLElement | null>>([]);
  const desktopLineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const glowARef = useRef<HTMLDivElement>(null);
  const glowBRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Reduced motion: skip the scroll-pinned crossfade entirely. The CSS
      // baseline below (`opacity-0 first:opacity-100`) shows only the first
      // headline with zero JS, and crucially there's no scroll-jacking pin --
      // the global @media (prefers-reduced-motion) CSS nukes CSS transitions
      // but GSAP drives motion via rAF/inline transforms, which bypass that
      // rule, so the scroll-jack would otherwise still trap reduced-motion
      // visitors. Returning before gsap.set means nothing is ever hidden,
      // so the no-JS fallback (first headline visible) is exactly what
      // reduced-motion users get.
      if (prefersReducedMotion()) return;

      // Scroll-pinned crossfade is a desktop flourish. On a touch device the
      // pin forces ~1.6 screens of captive scroll just to cycle four short
      // lines, which reads as a stuck page rather than an effect, and touch
      // has no hover to justify the parallax either. Skip the whole tween
      // below the sm breakpoint (640px, where the desktop headline layer
      // takes over): the CSS baseline shows only the first headline with zero
      // JS, so a phone gets one strong line, the scroll cue, and normal
      // scrolling -- no scroll-jack, no trapped gesture.
      if (
        typeof window !== "undefined" &&
        !window.matchMedia("(min-width: 640px)").matches
      )
        return;

      const groups = HEADLINES.map((_, i) =>
        [mobileLineRefs.current[i], desktopLineRefs.current[i]].filter(
          (el): el is HTMLElement => el !== null,
        ),
      );
      if (groups.every((g) => g.length === 0)) return;

      const allEls = groups.flat();
      gsap.set(allEls, { autoAlpha: 0, y: 24 });
      gsap.set(groups[0]!, { autoAlpha: 1, y: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          // 0.55x per transition, not a full viewport height each -- the
          // original 1x pin held the page for 3 full screens of forced
          // scroll just to read four short lines, with the right ~60% of
          // the viewport empty the whole time. Same crossfade, much less
          // scroll-jacking.
          end: () => (groups.length - 1) * window.innerHeight * 0.55,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      groups.forEach((group, i) => {
        if (i === groups.length - 1) return;
        tl.to(group, { autoAlpha: 0, y: -24, duration: 1 }).fromTo(
          groups[i + 1]!,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 1 },
          "<",
        );
      });

      // Mouse parallax on the two background glows only -- deliberately not
      // touching `container` (the pin target) or anything that wraps it.
      // These divs are plain siblings inside the pinned section, not
      // ancestors of it or of anything position:fixed, so a transform here
      // can't reintroduce the containing-block bug documented above (a
      // transformed ancestor breaking Hero's own fixed-position pin).
      if (prefersReducedMotion() || !glowARef.current || !glowBRef.current) {
        return;
      }
      const aX = gsap.quickTo(glowARef.current, "x", { duration: 0.9, ease: "power3" });
      const aY = gsap.quickTo(glowARef.current, "y", { duration: 0.9, ease: "power3" });
      const bX = gsap.quickTo(glowBRef.current, "x", { duration: 1.2, ease: "power3" });
      const bY = gsap.quickTo(glowBRef.current, "y", { duration: 1.2, ease: "power3" });

      const onMove = (e: MouseEvent) => {
        const rect = container.current!.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        aX(nx * 40);
        aY(ny * 40);
        bX(nx * -28);
        bY(ny * -28);
      };
      container.current!.addEventListener("mousemove", onMove);
      return () => container.current?.removeEventListener("mousemove", onMove);
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      // h-screen (100vh) base for browsers without dynamic viewport support;
      // upgraded to 100dvh where supported. On iOS Safari, 100vh extends
      // behind the address bar, which hid the ScrollCue at bottom-5 entirely
      // on iPhone. 100dvh tracks the *visible* viewport so the cue (and any
      // bottom-anchored hero content) stays in view. Safe for the desktop
      // scroll-pinned crossfade: dvh == vh on desktop (no dynamic chrome), and
      // the pin is gated to >=640px anyway, so the section height never shifts
      // mid-pin on the only viewport where the pin runs.
      className="relative h-screen supports-[height:100dvh]:h-dvh w-full overflow-hidden"
    >
      {/* The page's single <h1>. The visible hero headlines below are rendered
          twice -- once in a mobile layout (sm:hidden) and once in a desktop
          layout (hidden sm:block) -- and only one of those layers is ever
          on screen at a given viewport. If the <h1> lived inside either
          layer it would be display:none (and thus removed from the
          accessibility tree) on the other viewport, so the page would have
          no h1 at all for half its visitors. An always-present sr-only h1
          keeps exactly one heading in the a11y tree on every viewport and
          for SEO, while the visible animated taglines stay purely
          decorative (aria-hidden). The text matches the first visible
          headline so a screen-reader user hears the same thing sighted
          users see. */}
      <h1 className="sr-only">Appointed CFO at fourteen.</h1>
      {/* An actually-visible gradient this time -- the previous version was
          88% transparent and barely read as a gradient at all. Two stops
          (blue behind the photo, a whisper of the warm accent lower-left)
          for real depth, still within the established palette rule (no
          red/green as a literal color, unlike the reference this borrows
          the *vividness* from). */}
      <div className="absolute inset-0 bg-background" />
      <div
        ref={glowARef}
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_65%_at_78%_30%,color-mix(in_oklch,var(--accent-blue),transparent_75%)_0%,transparent_70%)]"
      />
      <div
        ref={glowBRef}
        className="animate-glow-breathe absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_15%_85%,color-mix(in_oklch,var(--accent-warm),transparent_92%)_0%,transparent_70%)]"
      />

      {/* No photo: removed entirely per Oliver's explicit instruction ("we
          just don't have my face at all"), not adjusted or hidden. This
          used to also contain a side-by-side photo column (mobile: stacked
          below the text; sm+: absolutely positioned on the right, masked
          into the text column) -- that whole column is gone, not repurposed.
          Left as a single-column, mobile-only-styled text block for now;
          the desktop headline positions below were originally chosen to
          share the row with that photo and may want reconsidering now that
          the space is empty. */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col px-6 sm:flex-row sm:items-center">
        <div className="shrink-0 pt-24 sm:flex-1 sm:pt-0">
          <div className="max-w-lg lg:max-w-xl sm:hidden">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Denver, Colorado
            </p>
            {/* Grid-stacked headlines: every tagline occupies the same grid
                cell (col-start-1 row-start-1), so they overlap for the
                GSAP crossfade while the container auto-sizes to the TALLEST
                headline. The old `relative h-[2.1em]` + `absolute inset-0`
                sized the box to 2.1em of the inherited 16px base (34px), not
                the 48px headline -- so a 2-4 line headline overflowed the box
                and overlapped the "Now building software." paragraph below by
                ~41px on phones. Grid makes the height track the real content
                at any width (more wrapping on narrow screens just grows the
                cell), so there's never overlap and never a hard-coded gap. */}
            <div className="grid">
              {HEADLINES.map((headline, i) => {
                // All four are decorative rotating taglines the crossfade
                // plays through. The page's single <h1> is the sr-only
                // heading at the top of this section, so these visible
                // taglines are demoted out of the heading hierarchy (plain
                // divs) and marked aria-hidden -- exactly one h1 for SEO
                // and screen-reader landmark navigation, instead of four
                // (or two, from the mobile/desktop duplication). GSAP
                // crossfades them regardless of tag (refs are tag-agnostic),
                // so the motion is unaffected.
                return (
                  <div
                    key={headline}
                    ref={(el) => {
                      mobileLineRefs.current[i] = el;
                    }}
                    aria-hidden="true"
                    className="col-start-1 row-start-1 whitespace-pre-line text-4xl font-black leading-[0.95] tracking-tight text-foreground opacity-0 first:opacity-100"
                  >
                    {headline}
                  </div>
                );
              })}
            </div>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Now building software.
            </p>
            <a
              href="/resume"
              onClick={(e) => {
                e.preventDefault();
                openResume();
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:border-accent-blue hover:text-accent-blue"
            >
              View résumé
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>

        {/* Mobile-only "At a glance" stats. The desktop dashboard panel
            below (hidden sm:block) surfaces these numbers on large screens;
            without this counterpart, a phone visitor doesn't see $250K
            donated / CFO-at-14 / venture count until the buried StatsSection
            ~9 screens down -- the exact "important info is at the very
            bottom on mobile" complaint. mt-auto pushes it to the bottom of
            the hero's flex-col (filling the empty lower half of the h-dvh
            hero that just held gradient on mobile), and pb-20 clears the
            ScrollCue anchored at bottom-5. Same STATS source + CountUp as
            the desktop panel and StatsSection, so all three can't drift. */}
        <div className="mt-auto pb-20 sm:hidden">
          <div className="max-w-lg">
            <div className="border-t border-border pt-5">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                At a glance
              </p>
              <div className="grid grid-cols-3 gap-3">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-black tracking-tight text-foreground">
                      <CountUp value={stat.value} />
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase leading-tight tracking-widest text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop-only headline layer. A direct child of the section
          (inset-0 against a fixed h-screen ancestor), never nested inside
          the flex row above -- see the note on DESKTOP_POSITION for why
          that separation matters. pointer-events-none since it overlaps
          the photo and shouldn't block interaction with anything there. */}
      <div className="pointer-events-none absolute inset-0 z-10 mx-auto hidden max-w-6xl px-6 sm:block">
        {HEADLINES.map((headline, i) => {
          return (
            <div
              key={headline}
              ref={(el) => {
                desktopLineRefs.current[i] = el;
              }}
              className={`absolute max-w-md opacity-0 first:opacity-100 ${DESKTOP_POSITION[i]}`}
            >
              <div
                aria-hidden="true"
                className="whitespace-pre-line text-6xl font-black leading-[0.95] tracking-tight text-foreground lg:text-7xl"
              >
                {headline}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dashboard panel: fills the right side that used to sit empty for
          the whole scroll-pinned intro. Real numbers already established
          in StatsSection (single source via lib/stats.ts), not new
          content -- a compact "at a glance" readout rather than dead
          gradient space. Positioned low enough (bottom-anchored) to clear
          DESKTOP_POSITION[2]'s right-aligned headline above it. */}
      <div className="pointer-events-none absolute inset-0 z-10 mx-auto hidden max-w-6xl px-6 sm:block">
        <div className="absolute bottom-20 right-6 w-64 rounded-xl border border-border bg-card/70 p-5 backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            At a glance
          </p>
          <div className="mt-4 space-y-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-black tracking-tight text-foreground">
                  <CountUp value={stat.value} />
                </p>
                <p className="mt-0.5 text-xs text-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
          <a
            href="/resume"
            onClick={(e) => {
              e.preventDefault();
              openResume();
            }}
            className="pointer-events-auto mt-5 flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
          >
            View résumé
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>

      <ScrollCue />
    </section>
  );
}
