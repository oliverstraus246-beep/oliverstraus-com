"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { postBeacon } from "@/lib/beacon";
import { computeScrollPct } from "@/lib/scroll-depth";
import { getOrCreateVisitorId } from "@/lib/visitor-id";

// IANA timezone, e.g. "America/Denver" -- Intl is universal in evergreen
// browsers, but this runs on every page load so a throw here (an ancient
// browser, a locked-down environment) must never break the beacon.
function getTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

// ?utm_source/utm_medium/utm_campaign off the CURRENT url -- general-purpose
// "which shared link sent this visitor" attribution, distinct from the
// résumé-only /r/resume redirect (src/app/r/resume/route.ts), which tags one
// specific document rather than any page.
function getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source")?.trim().slice(0, 100) || undefined,
    utmMedium: params.get("utm_medium")?.trim().slice(0, 100) || undefined,
    utmCampaign: params.get("utm_campaign")?.trim().slice(0, 100) || undefined,
  };
}

// Self-hosted page-view beacon -- fires once on mount and again on every
// client-side route change (usePathname changes on push/replace navigation,
// including the ViewTransition-driven navigations this site uses), plus
// once more when the visitor leaves or backgrounds the tab (to record how
// long they actually stayed). No third-party analytics script; posts to
// this site's own /api/track route, which is same-origin and covered by
// the existing `connect-src 'self'` CSP with no header changes needed.
function post(payload: object) {
  postBeacon("/api/track", payload);
}

interface ActiveView {
  viewId: string;
  startedAt: number;
}

export function VisitTracker() {
  const pathname = usePathname();
  // Holds the in-flight view's id + start time so the tab-hide listener
  // (registered once, outside the pathname effect) always knows which row
  // to attach a duration to, no matter which route it fires on.
  const activeView = useRef<ActiveView | null>(null);
  // How far down the window this view has scrolled, 0-100, reset on every
  // new view. A plain running max, not state -- it only ever needs to be
  // read once, when the view ends, never re-rendered on.
  const maxScrollPct = useRef(0);

  function flushDuration() {
    const view = activeView.current;
    if (!view) return;
    post({
      type: "duration",
      viewId: view.viewId,
      durationMs: Math.round(performance.now() - view.startedAt),
      maxScrollPct: maxScrollPct.current,
    });
  }

  useEffect(() => {
    // A route change ends the previous view -- record its duration before
    // starting the new one.
    flushDuration();

    const viewId = crypto.randomUUID();
    activeView.current = { viewId, startedAt: performance.now() };
    maxScrollPct.current = computeScrollPct(
      window.scrollY,
      document.documentElement.scrollHeight,
      window.innerHeight,
    );

    post({
      type: "view",
      viewId,
      path: pathname,
      referrer: document.referrer,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language,
      visitorId: getOrCreateVisitorId() ?? undefined,
      timezone: getTimezone(),
      ...getUtmParams(),
    });
  }, [pathname]);

  useEffect(() => {
    // visibilitychange covers mobile (where pagehide is unreliable) and the
    // "switched tabs and never came back" case; pagehide covers desktop tab
    // close and back/forward-cache navigations. Both can fire for the same
    // departure -- flushDuration() is a plain overwrite keyed by viewId, so
    // a duplicate send just re-sets the same value, not a double-count.
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushDuration();
    };
    // rAF-throttled: scroll fires far faster than this needs to be read, and
    // a running max only ever needs the occasional sample, not every event.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const pct = computeScrollPct(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
        if (pct > maxScrollPct.current) maxScrollPct.current = pct;
        ticking = false;
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushDuration);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushDuration);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
