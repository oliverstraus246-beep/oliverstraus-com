// Shared by visit-tracker.tsx (tracks window scroll) and resume-modal.tsx
// (tracks its own scrollable overlay instead of window) -- same math, two
// different scroll containers, so the calculation lives in one place.
export function computeScrollPct(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const scrollable = scrollHeight - clientHeight;
  // Nothing to scroll (page/content shorter than the viewport) -- the
  // visitor saw all of it on load, so that's 100%, not 0%.
  if (scrollable <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((scrollTop / scrollable) * 100)));
}
