import { describe, it, expect } from "vitest"
import { validateField, stepAfterSubmit } from "./contact-flow"

describe("validateField", () => {
  it("rejects an email with no @ or no TLD", () => {
    expect(validateField("email", "not-an-email")).toMatch(/valid email/)
    expect(validateField("email", "oliver@straus")).toMatch(/valid email/)
  })

  it("accepts a well-formed email", () => {
    expect(validateField("email", "oliver@example.com")).toBeNull()
  })

  it("rejects an empty name", () => {
    expect(validateField("name", "   ")).toMatch(/can't be empty/)
  })

  it("accepts a non-empty name", () => {
    expect(validateField("name", "Oliver")).toBeNull()
  })

  it("rejects an empty reason", () => {
    expect(validateField("reason", "")).toMatch(/Say a bit more/)
  })

  it("accepts a non-empty reason", () => {
    expect(validateField("reason", "Let's talk security work")).toBeNull()
  })
})

describe("stepAfterSubmit", () => {
  it("moves to done on success", () => {
    expect(stepAfterSubmit({ ok: true })).toBe("done")
  })

  it("moves to retry (not done) on failure, so the terminal stays usable", () => {
    expect(stepAfterSubmit({ ok: false, error: "Contact form isn't wired up yet." })).toBe(
      "retry",
    )
  })
})
