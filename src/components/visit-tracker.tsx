"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Self-hosted page-view beacon -- fires once on mount and again on every
// client-side route change (usePathname changes on push/replace navigation,
// including the ViewTransition-driven navigations this site uses). No
// third-party analytics script; posts to this site's own /api/track route,
// which is same-origin and covered by the existing `connect-src 'self'` CSP
// with no header changes needed.
//
// sendBeacon is preferred: it's fire-and-forget, survives the page
// unloading immediately after (a route change or tab close right after
// firing), and doesn't block navigation. Falls back to fetch(keepalive)
// for the rare browser without sendBeacon.
function sendPing(path: string) {
  const payload = JSON.stringify({ path, referrer: document.referrer });

  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon("/api/track", blob)) return;
  }

  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // A dropped page view must never surface to the visitor.
  });
}

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    sendPing(pathname);
  }, [pathname]);

  return null;
}
