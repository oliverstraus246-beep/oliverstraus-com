import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DownloadModal, openDownload } from "./download-modal"

describe("DownloadModal", () => {
  it("renders nothing until opened", () => {
    render(<DownloadModal />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows all three platform links with the right project+platform in the href", async () => {
    render(<DownloadModal />)
    openDownload("powerclaude")
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /macOS/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=mac",
    )
    expect(screen.getByRole("link", { name: /linux/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=linux",
    )
    expect(screen.getByRole("link", { name: /windows/i })).toHaveAttribute(
      "href",
      "/api/download/powerclaude?platform=windows",
    )
  })

  it("closes on Escape", async () => {
    const user = userEvent.setup()
    render(<DownloadModal />)
    openDownload("powerclaude")
    await screen.findByRole("dialog")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
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

  // No venture currently in VENTURES has `downloads` set without a license
  // (agent-supervisor isn't downloadable yet) -- a project string that
  // matches nothing in VENTURES exercises the same fallback path (no
  // matched venture -> no license) without fabricating venture data. This
  // also covers the "misconfigured project" graceful-degradation case.
  it("falls back to the raw project string and omits the license clause for an unmatched project", async () => {
    render(<DownloadModal />)
    openDownload("totally-unconfigured-project")
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAttribute("aria-label", "Download totally-unconfigured-project")
    expect(screen.queryByRole("link", { name: /license/i })).not.toBeInTheDocument()
    const termsLink = screen.getByRole("link", { name: "Terms" })
    expect(termsLink).toHaveAttribute("href", "/terms")
    expect(dialog.textContent).toContain("By downloading, you agree to our Terms.")
  })
})
