import { describe, it, expect } from "vitest"
import { isPlatform, pickCurrentRelease, PLATFORMS, type DownloadReleaseRow } from "./downloads"

describe("isPlatform", () => {
  it("accepts mac, linux, windows", () => {
    for (const p of PLATFORMS) expect(isPlatform(p)).toBe(true)
  })

  it("rejects anything else, including null", () => {
    expect(isPlatform("solaris")).toBe(false)
    expect(isPlatform(null)).toBe(false)
    expect(isPlatform("")).toBe(false)
  })
})

function row(overrides: Partial<DownloadReleaseRow> = {}): DownloadReleaseRow {
  return {
    id: "1",
    project: "powerclaude",
    platform: "mac",
    version: "1.0.0",
    blob_url: "https://blob.example/powerclaude-v1.0.0.tar.gz",
    sha256: "abc",
    size_bytes: 1024,
    is_current: true,
    created_at: "2026-10-02T00:00:00.000Z",
    ...overrides,
  }
}

describe("pickCurrentRelease", () => {
  it("returns the matching current row for the given project+platform", () => {
    const rows = [row(), row({ platform: "windows", id: "2" })]
    expect(pickCurrentRelease(rows, "powerclaude", "mac")?.id).toBe("1")
  })

  it("ignores a matching row that isn't current", () => {
    const rows = [row({ is_current: false })]
    expect(pickCurrentRelease(rows, "powerclaude", "mac")).toBeNull()
  })

  it("ignores a row for a different project", () => {
    const rows = [row({ project: "other-app" })]
    expect(pickCurrentRelease(rows, "powerclaude", "mac")).toBeNull()
  })

  it("returns null when nothing matches", () => {
    expect(pickCurrentRelease([], "powerclaude", "mac")).toBeNull()
  })
})
