import { describe, it, expect, beforeEach } from "vitest"
import { getOrCreateVisitorId } from "./visitor-id"

describe("getOrCreateVisitorId", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("creates and persists an id on first call", () => {
    const id = getOrCreateVisitorId()
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(window.localStorage.getItem("ov_vid")).toBe(id)
  })

  it("returns the same id on subsequent calls", () => {
    const first = getOrCreateVisitorId()
    const second = getOrCreateVisitorId()
    expect(second).toBe(first)
  })

  it("returns null instead of throwing when storage is unavailable", () => {
    // jsdom's localStorage is a Proxy that intercepts arbitrary property
    // access for storage reads/writes, so spying on its getItem method
    // directly doesn't reliably override it -- swapping the whole
    // window.localStorage reference for a throwing stand-in does.
    const original = window.localStorage
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem(): never {
          throw new Error("storage blocked")
        },
      },
    })
    try {
      expect(getOrCreateVisitorId()).toBeNull()
    } finally {
      Object.defineProperty(window, "localStorage", { configurable: true, value: original })
    }
  })
})
