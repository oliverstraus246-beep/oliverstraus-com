import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2 py-1", "text-sm")).toBe("px-2 py-1 text-sm")
  })

  it("resolves Tailwind conflicts, keeping the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("drops falsy values", () => {
    expect(cn("px-2", false, undefined, null, "py-1")).toBe("px-2 py-1")
  })
})
