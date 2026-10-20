const STORAGE_KEY = "ov_vid";

// Persistent first-party visitor identifier -- a random UUID kept in
// localStorage (not a cookie, so no Set-Cookie/consent-banner plumbing) and
// sent with every page_views beacon. Lets the admin visitor profile follow
// one real browser across an IP change instead of treating it as a new
// visitor each time. Wrapped in try/catch: private browsing, blocked storage,
// or a full quota can all throw here, and losing this is a degraded feature
// (no cross-IP merge for that visit), never a broken page.
export function getOrCreateVisitorId(): string | null {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}
