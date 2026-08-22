import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VentureModal } from "./venture-modal";

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

const VENTURE = {
  role: "Founder / CEO",
  name: "Imperial Detailing",
  description: "Mobile auto detailing. Profitable in its first season.",
};

describe("VentureModal", () => {
  it("renders the venture's role, name, and description as a dialog", () => {
    render(<VentureModal venture={VENTURE} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Imperial Detailing")).toBeInTheDocument();
    expect(screen.getByText("Founder / CEO")).toBeInTheDocument();
    expect(
      screen.getByText("Mobile auto detailing. Profitable in its first season."),
    ).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<VentureModal venture={VENTURE} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(<VentureModal venture={VENTURE} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked, not when the panel is clicked", () => {
    const onClose = vi.fn();
    render(<VentureModal venture={VENTURE} onClose={onClose} />);
    fireEvent.click(screen.getByText("Imperial Detailing"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("venture-modal-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus into the dialog on mount", () => {
    render(<VentureModal venture={VENTURE} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toHaveFocus();
  });
});
