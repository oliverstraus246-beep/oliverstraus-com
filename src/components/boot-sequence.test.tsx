import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { BootSequence } from "./boot-sequence"

// BootSequence now gates on usePathname() so the intro only plays on "/".
// Default the mock to the homepage so the existing behavior tests below
// (which assume the overlay runs) stay valid; the sub-route test overrides
// it per-test.
const pathnameMock = vi.fn(() => "/")
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}))

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe("BootSequence", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMatchMedia(false)
    pathnameMock.mockReturnValue("/")
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("reveals lines progressively, not all at once", async () => {
    render(<BootSequence />)
    expect(screen.queryByText("ACCESS GRANTED")).not.toBeInTheDocument()

    // Past all 10 line delays (400 + 9*320 = 3280ms) but before the 700ms
    // hold elapses and the outro/unmount kicks in.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3400)
    })

    expect(screen.getByText("ACCESS GRANTED")).toBeInTheDocument()
  })

  it("stops revealing further lines once skipped", async () => {
    render(<BootSequence />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    const firstLine = screen.getByText("$ ssh oliver@oliverstraus.com")
    expect(screen.queryByText("Authenticating...")).not.toBeInTheDocument()

    const overlay = firstLine.closest("[aria-hidden]")!
    fireEvent.click(overlay)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.queryByText("Authenticating...")).not.toBeInTheDocument()
  })

  it("unmounts entirely once the outro finishes", async () => {
    const { container } = render(<BootSequence />)
    fireEvent.click(container.querySelector("[aria-hidden]")!)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(container.querySelector("[aria-hidden]")).not.toBeInTheDocument()
  })

  it("skips straight through for prefers-reduced-motion users", async () => {
    mockMatchMedia(true)
    const { container } = render(<BootSequence />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(container.firstChild).toBeNull()
  })

  it("never plays on sub-routes (case studies, résumé, etc.)", async () => {
    pathnameMock.mockReturnValue("/work/sectra")
    const { container } = render(<BootSequence />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // No overlay, no boot lines -- a reload on a project page shouldn't
    // re-introduce the site.
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText("$ ssh oliver@oliverstraus.com")).not.toBeInTheDocument()
  })
})
