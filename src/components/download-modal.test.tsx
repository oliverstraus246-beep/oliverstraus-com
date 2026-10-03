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
})
