import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Nav } from "./nav"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe("Nav", () => {
  it("renders closed by default", () => {
    render(<Nav />)
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("opens the overlay and lists all 4 section links", () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))

    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    for (const label of ["Work", "About", "Resume", "Contact"]) {
      expect(
        screen.getByRole("link", { name: new RegExp(label) }),
      ).toBeInTheDocument()
    }
  })

  it("closes when a link is clicked", () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
    fireEvent.click(screen.getByRole("link", { name: /Work/ }))

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("closes on Escape", () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
    fireEvent.keyDown(window, { key: "Escape" })

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })
})
