import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DownloadModal, openDownload } from "./download-modal"

describe("DownloadModal", () => {
  it("renders nothing until opened", () => {
    render(<DownloadModal />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows macOS and Windows as direct links, Linux as an expanding button", async () => {
    render(<DownloadModal />)
    openDownload("powerclaude")
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /macOS/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=mac",
    )
    expect(screen.getByRole("link", { name: /windows/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=windows",
    )
    // "Linux" is a button here, not a link -- it opens the sub-step rather
    // than downloading directly, since Linux has three real format choices.
    // Matched loosely (not an exact "Linux" string): jsdom's own default
    // User-Agent contains "linux", so the "Detected" badge legitimately
    // renders appended to the label in this test environment -- see the
    // dedicated detection test below, which asserts on that directly.
    expect(screen.getByRole("button", { name: /^linux/i })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /^linux/i })).not.toBeInTheDocument()
  })

  it("highlights Linux as the detected OS, matching jsdom's own default User-Agent", async () => {
    render(<DownloadModal />)
    openDownload("powerclaude")
    await screen.findByRole("dialog")
    const linuxButton = screen.getByRole("button", { name: /^linux/i })
    expect(linuxButton).toHaveTextContent("Detected")
    // The other two top-level options are real choices too, just not the
    // detected one -- confirm they do NOT carry the badge.
    expect(screen.getByRole("link", { name: /macOS/i })).not.toHaveTextContent("Detected")
    expect(screen.getByRole("link", { name: /windows/i })).not.toHaveTextContent("Detected")
  })

  it("expands Linux into arch/debian/generic links, and Back returns to the top step", async () => {
    const user = userEvent.setup()
    render(<DownloadModal />)
    openDownload("powerclaude")
    await screen.findByRole("dialog")
    await user.click(screen.getByRole("button", { name: /^linux/i }))

    expect(screen.getByRole("link", { name: /arch linux/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=arch",
    )
    expect(screen.getByRole("link", { name: /debian/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=debian",
    )
    expect(screen.getByRole("link", { name: /other linux/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=linux",
    )
    // Top-level options aren't shown while in the Linux sub-step.
    expect(screen.queryByRole("link", { name: /macOS/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByRole("link", { name: /macOS/i })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /arch linux/i })).not.toBeInTheDocument()
  })

  it("closes on Escape from the top step", async () => {
    const user = userEvent.setup()
    render(<DownloadModal />)
    openDownload("powerclaude")
    await screen.findByRole("dialog")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("Escape from the Linux sub-step goes back to the top step first, then closes on a second Escape", async () => {
    const user = userEvent.setup()
    render(<DownloadModal />)
    openDownload("powerclaude")
    await screen.findByRole("dialog")
    await user.click(screen.getByRole("button", { name: /^linux/i }))
    expect(screen.getByRole("link", { name: /arch linux/i })).toBeInTheDocument()

    await user.keyboard("{Escape}")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /macOS/i })).toBeInTheDocument()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("re-opening always starts back at the top step, even after a prior visit expanded Linux", async () => {
    const user = userEvent.setup()
    render(<DownloadModal />)
    openDownload("powerclaude")
    await screen.findByRole("dialog")
    await user.click(screen.getByRole("button", { name: /^linux/i }))
    await user.keyboard("{Escape}{Escape}")

    openDownload("powerclaude")
    await screen.findByRole("dialog")
    expect(screen.getByRole("link", { name: /macOS/i })).toBeInTheDocument()
  })

  it("shows the matched venture's license in the footer and aria-label for a known project", async () => {
    render(<DownloadModal />)
    openDownload("powerclaude")
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAttribute("aria-label", "Download PowerClaude")
    const licenseLink = screen.getByRole("link", { name: /MIT License/i })
    expect(licenseLink).toHaveAttribute(
      "href",
      "https://gitlab.com/oliverstraus/powerclaude/-/blob/main/LICENSE",
    )
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms")
  })

  // agent-supervisor is a real, matched venture with no license set -- this
  // is the genuine "matched venture, no license" path (closes out the gap
  // the generalization task could only approximate with an unmatched
  // project string, before this venture was downloadable).
  it("omits the license clause for a matched venture that has no license", async () => {
    render(<DownloadModal />)
    openDownload("agent-supervisor")
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAttribute("aria-label", "Download AI Agent Supervisor")
    expect(screen.queryByRole("link", { name: /license/i })).not.toBeInTheDocument()
    const termsLink = screen.getByRole("link", { name: "Terms" })
    expect(termsLink).toHaveAttribute("href", "/terms")
    expect(dialog.textContent).toContain("By downloading, you agree to our Terms.")
  })

  // A project string matching nothing in VENTURES exercises the same
  // fallback path from the opposite direction (no venture at all, not just
  // no license) -- the "misconfigured project" graceful-degradation case.
  it("falls back to the raw project string for a completely unmatched project", async () => {
    render(<DownloadModal />)
    openDownload("totally-unconfigured-project")
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAttribute("aria-label", "Download totally-unconfigured-project")
    expect(screen.queryByRole("link", { name: /license/i })).not.toBeInTheDocument()
  })
})
