import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, act } from "@testing-library/react"
import { ScrollReset } from "./scroll-reset"

describe("ScrollReset", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("disables browser scroll restoration and scrolls to top on mount", () => {
    const scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy
    history.scrollRestoration = "auto"

    render(<ScrollReset />)

    expect(history.scrollRestoration).toBe("manual")
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
  })

  it("re-asserts scroll position if something scrolls away from 0 during the poll window", () => {
    const scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy
    Object.defineProperty(window, "scrollY", { value: 7449, writable: true })

    render(<ScrollReset />)
    scrollToSpy.mockClear()

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
  })

  it("stops polling after the poll window ends", () => {
    const scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy
    Object.defineProperty(window, "scrollY", { value: 7449, writable: true })

    render(<ScrollReset />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    scrollToSpy.mockClear()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it("renders nothing", () => {
    const { container } = render(<ScrollReset />)
    expect(container).toBeEmptyDOMElement()
  })
})
