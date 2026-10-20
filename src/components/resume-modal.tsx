"use client";

import { useEffect, useRef, useState } from "react";
import { postBeacon } from "@/lib/beacon";
import { ResumeContent } from "@/components/resume-content";
import { ResumePresetPicker } from "@/components/resume-preset-picker";
import { computeScrollPct } from "@/lib/scroll-depth";
import { useResumePreset } from "@/lib/use-resume-preset";
import { getOrCreateVisitorId } from "@/lib/visitor-id";

function getTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

const OPEN_EVENT = "open-resume";

/** Any trigger point calls this instead of linking to a file directly. */
export function openResume() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Mounted once (see layout.tsx). Listens for the open-resume event so the
 * nav overlay, footer, hero CTA, and command palette can all open the same
 * modal without prop drilling. "Download" is a scoped window.print() --
 * see .resume-print-area in globals.css -- rather than a static file, so
 * it can never drift out of sync with the real content in resume.ts.
 */
export function ResumeModal() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { preset } = useResumePreset();
  // The element that had focus when the modal opened -- the trigger button
  // (nav, footer, hero CTA, command palette). Focus returns here on close so
  // keyboard users aren't dropped back to the top of the page.
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // viewId + start time for the in-flight "view" beacon below, so the
  // close/unmount side can attach a duration to the same row.
  const activeView = useRef<{ viewId: string; startedAt: number } | null>(null);
  // The overlay (not the panel) is the scrollable element -- see its
  // overflow-y-auto below -- so scroll depth is tracked against it, not
  // window, which never scrolls while the modal covers the page.
  const overlayRef = useRef<HTMLDivElement>(null);
  const maxScrollPct = useRef(0);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // The modal is the primary way people read the résumé (nav, footer, hero
  // CTA, command palette all open it in place) -- the standalone /resume
  // route that VisitTracker covers is really just the no-JS/share-link
  // fallback. Without this, opening the modal was invisible to analytics:
  // no route change, so no page_views row, so "who's looked at my résumé"
  // had no answer for the common case. Beacons the same shape VisitTracker
  // sends for a real navigation, into the same page_views table, so it
  // shows up in /admin/stats and the visitor profile exactly like any other
  // page view.
  useEffect(() => {
    if (!open) return;
    const viewId = crypto.randomUUID();
    activeView.current = { viewId, startedAt: performance.now() };
    maxScrollPct.current = 0;
    postBeacon("/api/track", {
      type: "view",
      viewId,
      path: "/resume",
      referrer: document.referrer,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language,
      visitorId: getOrCreateVisitorId() ?? undefined,
      timezone: getTimezone(),
    });
    return () => {
      const view = activeView.current;
      if (!view) return;
      postBeacon("/api/track", {
        type: "duration",
        viewId: view.viewId,
        durationMs: Math.round(performance.now() - view.startedAt),
        maxScrollPct: maxScrollPct.current,
      });
      activeView.current = null;
    };
  }, [open]);

  // Tracks how far the visitor scrolled through the résumé itself, same
  // rAF-throttled running-max approach as VisitTracker's window scroll.
  useEffect(() => {
    if (!open) return;
    const el = overlayRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const pct = computeScrollPct(el.scrollTop, el.scrollHeight, el.clientHeight);
        if (pct > maxScrollPct.current) maxScrollPct.current = pct;
        ticking = false;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  // While the modal is open, flag <body> so the print stylesheet knows
  // the résumé is being printed from here (not the standalone /resume
  // route, where the modal stays closed and the résumé lives inside
  // #site-content). Two things break printing from the modal otherwise:
  //   1. This overlay is position:fixed, which in print repeats on every
  //      page -- so the résumé reprinted once per page of the tall
  //      homepage behind it ("downloaded 5 times").
  //   2. The homepage behind it is visibility:hidden but still in flow,
  //      adding the blank pages that became those extra copies.
  // data-print-resume="modal" lets globals.css neutralize the overlay's
  // fixed positioning and drop #site-content for the duration of the print.
  useEffect(() => {
    if (!open) return;
    document.body.dataset.printResume = "modal";
    return () => {
      delete document.body.dataset.printResume;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Dialog focus management: move focus into the panel on open, trap Tab
  // within the dialog (so keyboard users can't tab out into the homepage
  // hidden behind the overlay), lock background scroll, and restore focus
  // to the trigger on close. These are the parts a bare role="dialog"
  // doesn't give you -- without them a screen-reader/keyboard user opens
  // the résumé and is stranded on a focusable-poor overlay with no way back
  // but Escape, and Tab leaks into the page behind it.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    const panel = panelRef.current;
    if (panel) {
      // Focus the dialog container itself (tabIndex=-1) rather than a control
      // so the first Tab lands cleanly on the first button and the screen
      // reader announces "Résumé, dialog" from aria-label.
      panel.focus();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const p = panelRef.current;
      if (!p) return;
      const nodes = Array.from(
        p.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => {
        // visible & focusable: offsetParent is null for display:none, and
        // we also reject zero-size elements.
        const rect = n.getBoundingClientRect();
        return n.offsetParent !== null && rect.width > 0 && rect.height > 0;
      });
      if (!nodes.length) {
        e.preventDefault();
        p.focus();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === p) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onTab);
    return () => {
      window.removeEventListener("keydown", onTab);
      document.body.style.overflow = prevOverflow;
      // Return focus to whatever opened the modal (the trigger button).
      // Guarded: some browsers set activeElement to <body> if the trigger
      // was already blurred.
      const prev = previousFocusRef.current;
      if (prev && document.contains(prev)) {
        try {
          prev.focus();
        } catch {
          /* element no longer focusable */
        }
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="resume-modal-overlay fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm sm:px-6"
      onClick={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Résumé"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="resume-modal-panel w-full max-w-3xl overflow-hidden rounded-2xl bg-neutral-50 shadow-2xl focus:outline-none"
      >
        <div className="no-print sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/95 backdrop-blur-sm">
          {/* Header row: label + actions. On sm+ the preset picker sits
              inline between them (one row, fits ~768px panel). On mobile it
              drops to its own row below so the four style buttons don't wrap
              into a multi-line block -- a 166px sticky header was eating ~20%
              of the viewport while reading a 3700px résumé. Two picker
              instances are fine: only one is visible at any breakpoint (the
              other is display:none, removed from the a11y tree), and both
              stay in sync via the shared localStorage + change-event store. */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
              Résumé
            </p>
            <div className="hidden sm:block">
              <ResumePresetPicker />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  postBeacon("/api/resume/download", { preset });
                  window.print();
                }}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition-colors duration-150 hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close résumé"
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition-colors duration-150 hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
          {/* Mobile-only preset row: horizontally scrollable, never wraps,
              so the four buttons stay on a single ~40px line instead of
              stacking into a tall block. */}
          <div className="px-4 pb-3 sm:hidden">
            <ResumePresetPicker className="overflow-x-auto" />
          </div>
        </div>
        <ResumeContent />
      </div>
    </div>
  );
}
