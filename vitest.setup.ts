import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"

// jsdom doesn't implement matchMedia. Components that check
// prefers-reduced-motion (nav, hero, scroll-reveal, cursor, boot-sequence)
// call it during render/layout effects, so provide a no-op default that
// reports no motion preference. Per-test files that need a specific
// preference (cursor.test, boot-sequence.test) override this with their
// own vi.fn() mock, which takes precedence.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as typeof window.matchMedia
}

// jsdom also doesn't ship IntersectionObserver. Components that track
// visibility (useScrollSpy, useInView, CountUp, DotGrid) construct it during
// their layout effects; a no-op stub keeps them from throwing in tests. The
// callback is intentionally never invoked -- tests that need real intersection
// behavior mock it themselves. Matches the matchMedia pattern above.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    readonly root = null
    readonly rootMargin = ""
    readonly thresholds: ReadonlyArray<number> = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  } as unknown as typeof IntersectionObserver
}

afterEach(() => {
  cleanup()
})
