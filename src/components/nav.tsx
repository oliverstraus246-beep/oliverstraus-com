"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CommandPalette } from "@/components/command-palette";
import { openResume } from "@/components/resume-modal";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PLATFORMS } from "@/components/social-links";
import { useScrollSpy } from "@/lib/use-scroll-spy";

// Section anchors are prefixed with "/" so they resolve from every route,
// not just the homepage -- "#work" on /resume or /work/[slug] silently does
// nothing because those section ids only exist on /. "/#work" navigates home
// then scrolls; on the homepage itself the path already matches so the
// browser just scrolls (no reload).
const LINKS = [
  { href: "/#work", label: "Work" },
  { href: "/#about", label: "About" },
  { href: "/resume", label: "Resume", isResume: true },
  { href: "/#contact", label: "Contact" },
];

// Inline desktop section nav. The full-screen overlay menu (LINKS above) is
// the mobile nav; on wide screens, quick-scroll links to each section sit
// in the header itself so a desktop visitor doesn't have to open the menu
// to jump around. `id` keys each link to the scrollspy section(s) that mark
// it active. Resume opens the modal and is never "active" -- it isn't a
// scroll target. Contact is intentionally NOT here: the "Get in touch" pill
// in the right cluster is the contact CTA, so a second "Contact" link would
// just duplicate it.
interface SectionLink {
  id: string;
  href: string;
  label: string;
  isResume?: boolean;
}
const SECTION_LINKS: readonly SectionLink[] = [
  { id: "work", href: "/#work", label: "Work" },
  { id: "about", href: "/#about", label: "About" },
  { id: "resume", href: "/resume", label: "Resume", isResume: true },
];

// Sections the scrollspy watches. Timeline and Skills don't have their own
// nav link, so they roll up to the nearest preceding link's active state --
// keeps a link highlighted through the whole mid-page scroll instead of
// going blank between named sections.
const SPY_IDS = ["work", "timeline", "about", "skills", "contact"];

export function Nav() {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const activeId = useScrollSpy(SPY_IDS);

  function isSectionActive(link: SectionLink) {
    if (link.id === "work") return activeId === "work" || activeId === "timeline";
    if (link.id === "about") return activeId === "about" || activeId === "skills";
    if (link.id === "contact") return activeId === "contact";
    return false; // Resume isn't a scroll target.
  }

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    // Lock background scroll while the full-screen menu overlay is open --
    // the overlay is opaque, but without this a keyboard PageDown or a
    // gesture could still scroll the homepage behind it.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      // Trap Tab within the overlay's focusable set (the in-overlay close
      // button + the nav links). The header's controls are inert while the
      // menu is open, but the page content behind the overlay is still in
      // the tab order -- so without this wrap, Tab would escape forward into
      // the hidden page or backward out of the menu entirely.
      const overlay = overlayRef.current;
      if (!overlay) return;
      const nodes = Array.from(
        overlay.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Move focus into the menu when it opens, and hand it back to the trigger
  // when it closes -- keyboard/screen-reader users get a predictable focus
  // path instead of landing on an overlay with no focus, or losing focus
  // when it dismisses. Skips the initial mount so it never steals focus to
  // the menu button on page load.
  const didOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      didOpenRef.current = true;
      // Defer past GSAP's useGSAP hook below: it sets the overlay's
      // autoAlpha (visibility), but the reveal happens on GSAP's own
      // animation tick, not synchronously with this effect. If focus
      // fires before that, the link is still visibility:hidden from the
      // closed state and the browser drops the call (can't focus a hidden
      // element) -- leaving focus stranded on the menu button. A double
      // requestAnimationFrame guarantees we're past GSAP's first reveal
      // tick, so the link is visible and focusable.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const first = linkRefs.current.find(
            (el): el is HTMLAnchorElement => !!el,
          );
          first?.focus();
        }),
      );
    } else if (didOpenRef.current) {
      menuBtnRef.current?.focus();
    }
  }, [open]);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useGSAP(
    () => {
      const links = linkRefs.current.filter(
        (el): el is HTMLAnchorElement => el !== null,
      );
      // Reduced motion: toggle instantly. The global CSS reduces
      // transitions but GSAP bypasses it, and a plain early return would
      // leave the overlay at its CSS opacity-0 even when open (invisible but
      // pointer-events-auto). Snapping autoAlpha keeps it usable.
      if (prefersReducedMotion()) {
        gsap.set(overlayRef.current, { autoAlpha: open ? 1 : 0 });
        gsap.set(links, { opacity: 1, y: 0 });
        return;
      }
      if (open) {
        gsap.to(overlayRef.current, {
          autoAlpha: 1,
          duration: 0.3,
          ease: "power2.out",
        });
        gsap.fromTo(
          links,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.07,
            delay: 0.1,
          },
        );
      } else {
        gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.25,
          ease: "power2.in",
        });
      }
    },
    { dependencies: [open], scope: overlayRef },
  );

  return (
    <>
      <header className="no-print fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={close}
            // Inert while the menu overlay is open: the logo sits behind the
            // opaque z-60 overlay (header is z-50) so it's not clickable
            // anyway, and removing it from the tab order keeps keyboard focus
            // from leaking out of the menu trap.
            inert={open}
          >
            <Image
              src="/assets/logo.png"
              alt=""
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="font-mono text-sm font-medium tracking-tight">
              Oliver Straus
              <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] animate-pulse bg-accent-blue align-middle" />
            </span>
          </Link>

          {/* Inline desktop section nav. Hidden below md (the hamburger
              overlay covers mobile). Inert while that overlay is open so
              keyboard focus can't leak behind it, matching the logo and the
              right-hand controls. The underline draws on hover and stays
              drawn for the active section (scrollspy, above). */}
          <nav
            className="hidden items-center gap-7 md:flex"
            aria-label="Sections"
            inert={open}
          >
            {SECTION_LINKS.map((link) => {
              const active = isSectionActive(link);
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={(e) => {
                    if (link.isResume) {
                      e.preventDefault();
                      openResume();
                    }
                  }}
                  aria-current={active ? "true" : undefined}
                  className={`group relative inline-flex items-center py-2 font-mono text-[11px] uppercase tracking-widest transition-colors duration-150 ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0.5 left-0 h-px w-full origin-left bg-accent-blue transition-transform duration-300 ease-out ${
                      active
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* Inert while the menu is open so the command palette, theme
                switcher, and "Get in touch" link -- all behind the overlay --
                can't receive focus and break the Tab trap. The menu button
                stays outside this wrapper so it remains the trap's first
                focusable (and the close control). */}
            <div className="flex items-center gap-3" inert={open}>
              <CommandPalette />
              <ThemeSwitcher />

              <Link
                href="/#contact"
                className="hidden h-11 items-center rounded-full border border-border px-4 font-mono text-xs uppercase tracking-widest transition-colors duration-150 hover:border-accent-blue hover:text-accent-blue sm:inline-flex"
              >
                Get in touch
              </Link>
            </div>

            <button
              type="button"
              ref={menuBtnRef}
              onClick={() => setOpen((v) => !v)}
              // Stable accessible name, not a toggled "Open"/"Close" pair: this
              // button is `inert` while the menu is open (see below), so it's
              // removed from the accessibility tree exactly when the overlay's
              // own "Close menu" button is the live close control. A dynamic
              // "Close menu" label here would duplicate that button's name
              // (two elements, same accessible name) for as long as both are
              // in the DOM -- ambiguous for AT and for role queries. Keeping
              // "Open menu" means the only state in which this button is ever
              // exposed to AT is closed, where "Open menu" is exactly right;
              // aria-expanded carries the open/closed state without relabeling.
              aria-label="Open menu"
              aria-expanded={open}
              aria-haspopup="true"
              // The header (z-50) sits below the overlay (z-60), so this
              // button is covered and not clickable while the menu is open.
              // Inert also removes it from the tab order so keyboard focus
              // never lands on the hidden button -- the in-overlay close
              // button is the visible close affordance. Focus is restored
              // here on close (in the effect above) once it's un-inerted.
              inert={open}
              className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-border transition-colors duration-150 hover:border-accent-blue"
            >
              <span
                className={`h-px w-4 bg-foreground transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
              />
              <span
                className={`h-px w-4 bg-foreground transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={overlayRef}
        className={`fixed inset-0 z-[60] flex flex-col justify-center bg-background px-6 opacity-0 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Menu"
        // inert removes the hidden overlay's links from the tab order and
        // the accessibility tree entirely -- opacity/pointer-events alone
        // don't, so a closed menu used to leave four invisible links
        // reachable via Tab. Mirrors aria-hidden and toggles with it.
        inert={!open}
      >
        {/* Visible close affordance inside the overlay itself. The header's
            hamburger button is below this overlay (z-50 < z-60) and inert
            while open, so it can't be the close control -- and on mobile
            there's no Escape key, so a touch user opening the menu needs a
            visible way to dismiss it without picking a link. This sits at
            the overlay's top-right, above the centered links. */}
        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="absolute right-6 top-6 flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-border transition-colors duration-150 hover:border-accent-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="h-px w-4 translate-y-[3.5px] rotate-45 bg-foreground" />
          <span className="h-px w-4 -translate-y-[3.5px] -rotate-45 bg-foreground" />
        </button>
        <nav className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          {LINKS.map((link, i) => (
            <Link
              key={link.href}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              href={link.href}
              onClick={(e) => {
                if (link.isResume) {
                  e.preventDefault();
                  openResume();
                }
                close();
              }}
              className="group relative flex items-baseline gap-4 border-b border-border py-4 font-mono text-5xl font-black tracking-tight text-foreground transition-colors hover:text-accent-blue sm:text-7xl"
            >
              <span className="text-lg text-accent-blue-dim/60 sm:text-2xl">
                0{i + 1}
              </span>
              {link.label}
              <span
                aria-hidden="true"
                className="absolute bottom-[-1px] left-0 h-0.5 w-full origin-left scale-x-0 bg-accent-blue transition-transform duration-300 ease-out group-hover:scale-x-100"
              />
            </Link>
          ))}
        </nav>

        {/* Social row pinned to the bottom of the open overlay. On mobile a
            visitor who opens the menu to find a channel shouldn't have to
            dismiss it and scroll to the footer to reach LinkedIn/GitLab/etc.
            -- these sit a thumb-reach away below the big links. absolute (not
            in the flex flow) so the centered links keep their vertical
            centering; the whole overlay is inert + opacity-0 when closed, so
            these are hidden and removed from the tab order alongside it. */}
        <div className="absolute bottom-8 left-0 right-0 mx-auto flex w-full max-w-4xl justify-center gap-6 px-6">
          {PLATFORMS.map((platform) => (
            <a
              key={platform.label}
              href={platform.href}
              target="_blank"
              rel="noreferrer noopener"
              onClick={close}
              // py-1.5 -my-1.5 grows the tap box to ~28px (WCAG 2.2 AA 24px
              // minimum) with the negative margin cancelling the box growth
              // so visual position is unchanged; gap-6 keeps the 6px-per-side
              // hit-box expansion from touching a neighbor.
              className="inline-flex items-center py-1.5 -my-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-150 hover:text-accent-blue"
            >
              {platform.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
