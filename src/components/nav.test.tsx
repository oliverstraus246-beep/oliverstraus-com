import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
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

    // The toggle is `inert` while open, so the overlay's own "Close menu"
    // button is the single exposed close control -- one match, not two.
    // The overlay itself becomes a named dialog, which is the real signal
    // that the menu opened.
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument()
    const dialog = screen.getByRole("dialog", { name: "Menu" })
    // Scope to the dialog: the inline desktop nav renders its own "Work" /
    // "About" / "Contact" links, and jsdom doesn't honor `inert` on the
    // closed overlay's copies, so an unscoped query would find two. In a
    // real browser the closed overlay is `inert` (removed from the a11y
    // tree) and only the inline + the open dialog's links are exposed.
    for (const label of ["Work", "About", "Resume", "Contact"]) {
      expect(
        within(dialog).getByRole("link", { name: new RegExp(label) }),
      ).toBeInTheDocument()
    }
  })

  it("closes when a link is clicked", () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
    // Click the overlay's Work link (scoped) -- not the inline nav's.
    const dialog = screen.getByRole("dialog", { name: "Menu" })
    fireEvent.click(within(dialog).getByRole("link", { name: /Work/ }))

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
