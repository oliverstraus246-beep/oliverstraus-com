"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Self-hosted page-view beacon -- fires once on mount and again on every
// client-side route change (usePathname changes on push/replace navigation,
// including the ViewTransition-driven navigations this site uses), plus
// once more when the visitor leaves or backgrounds the tab (to record how
// long they actually stayed). No third-party analytics script; posts to
// this site's own /api/track route, which is same-origin and covered by
// the existing `connect-src 'self'` CSP with no header changes needed.
//
// sendBeacon is preferred: it's fire-and-forget, survives the page
// unloading immediately after (a route change or tab close right after
// firing), and doesn't block navigation. Falls back to fetch(keepalive)
// for the rare browser without sendBeacon.
function post(payload: object) {
  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/track", blob)) return;
  }

  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // A dropped page view must never surface to the visitor.
  });
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

  function flushDuration() {
    const view = activeView.current;
    if (!view) return;
    post({
      type: "duration",
      viewId: view.viewId,
      durationMs: Math.round(performance.now() - view.startedAt),
    });
  }

  useEffect(() => {
    // A route change ends the previous view -- record its duration before
    // starting the new one.
    flushDuration();

    const viewId = crypto.randomUUID();
    activeView.current = { viewId, startedAt: performance.now() };

    post({
      type: "view",
      viewId,
      path: pathname,
      referrer: document.referrer,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language,
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
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushDuration);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushDuration);
    };
  }, []);

  return null;
}
