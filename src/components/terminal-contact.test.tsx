import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TerminalContact } from "./terminal-contact"

function typeAndSubmit(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
  fireEvent.submit(input.closest("form")!)
}

describe("TerminalContact", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("re-prompts on an invalid email and still accepts the next attempt", async () => {
    render(<TerminalContact />)
    const input = screen.getByRole("textbox", { name: /email/i })

    typeAndSubmit(input, "not-an-email")
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    // The input must still be usable -- this is the exact bug reported twice.
    expect(input).not.toBeDisabled()
    expect(screen.getByRole("textbox")).toHaveValue("")

    typeAndSubmit(screen.getByRole("textbox"), "oliver@example.com")
    expect(await screen.findByText("Please input your name:")).toBeInTheDocument()
  })

  it("survives repeated invalid attempts in a row, not just one retry", async () => {
    render(<TerminalContact />)

    for (const bad of ["x", "still-bad", "@nope"]) {
      typeAndSubmit(screen.getByRole("textbox"), bad)
      expect(await screen.findAllByText(/valid email/i)).not.toHaveLength(0)
      expect(screen.getByRole("textbox")).not.toBeDisabled()
    }

    typeAndSubmit(screen.getByRole("textbox"), "oliver@example.com")
    expect(await screen.findByText("Please input your name:")).toBeInTheDocument()
  })

  it("walks all three fields through to submission", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    )
    render(<TerminalContact />)

    typeAndSubmit(screen.getByRole("textbox"), "oliver@example.com")
    typeAndSubmit(await screen.findByRole("textbox"), "Oliver")
    typeAndSubmit(await screen.findByRole("textbox"), "Let's talk security work")

    expect(await screen.findByText(/message received/i)).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("stays retryable on submit failure instead of locking up", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Contact form isn't wired up yet." }),
      }),
    )
    render(<TerminalContact />)

    typeAndSubmit(screen.getByRole("textbox"), "oliver@example.com")
    typeAndSubmit(await screen.findByRole("textbox"), "Oliver")
    typeAndSubmit(await screen.findByRole("textbox"), "Let's talk security work")

    expect(await screen.findByText("Contact form isn't wired up yet.")).toBeInTheDocument()
    const retryInput = await screen.findByRole("textbox")
    expect(retryInput).not.toBeDisabled()

    fireEvent.submit(retryInput.closest("form")!)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })
})
