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

afterEach(() => {
  cleanup()
})
