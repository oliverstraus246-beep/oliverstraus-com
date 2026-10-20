import { describe, it, expect } from "vitest"
import { computeScrollPct } from "./scroll-depth"

describe("computeScrollPct", () => {
  it("is 100 when the content is shorter than the viewport", () => {
    expect(computeScrollPct(0, 500, 800)).toBe(100)
    expect(computeScrollPct(0, 800, 800)).toBe(100)
  })

  it("is 0 at the top of a scrollable page", () => {
    expect(computeScrollPct(0, 2000, 800)).toBe(0)
  })

  it("is 100 at the bottom of a scrollable page", () => {
    expect(computeScrollPct(1200, 2000, 800)).toBe(100)
  })

  it("rounds a partial scroll", () => {
    expect(computeScrollPct(600, 2000, 800)).toBe(50)
  })

  it("clamps an over-scroll (elastic/bounce scrolling) to 100", () => {
    expect(computeScrollPct(1300, 2000, 800)).toBe(100)
  })
})
