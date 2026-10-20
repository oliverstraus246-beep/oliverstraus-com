// Fire-and-forget JSON POST that survives the page unloading right after it
// fires (a route change, a modal closing into window.print(), a tab close).
// sendBeacon is preferred: it queues the send and returns immediately
// without blocking whatever happens next. Falls back to fetch(keepalive)
// for the rare browser without it. Shared by visit-tracker.tsx (page view
// beacons) and the résumé modal/print button (view + download beacons) so
// the fallback logic lives in exactly one place.
export function postBeacon(url: string, payload: object) {
  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // A dropped beacon must never surface to the visitor.
  });
}
