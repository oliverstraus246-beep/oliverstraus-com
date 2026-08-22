import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Cursor } from "./cursor";

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("Cursor", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    document.body.className = "";
  });

  it("renders the four-line mark", () => {
    const { container } = render(<Cursor />);
    expect(container.querySelectorAll(".cursor-mark-base")).toHaveLength(4);
  });

  it("marks the body as having a custom cursor so native cursor can be hidden", () => {
    render(<Cursor />);
    expect(document.body.classList.contains("custom-cursor-active")).toBe(true);
  });

  it("removes the body class on unmount", () => {
    const { unmount } = render(<Cursor />);
    expect(document.body.classList.contains("custom-cursor-active")).toBe(true);
    unmount();
    expect(document.body.classList.contains("custom-cursor-active")).toBe(false);
  });

  it("does not activate for prefers-reduced-motion users, leaving the native cursor alone", () => {
    mockMatchMedia(true);
    const { container } = render(<Cursor />);
    expect(container.querySelectorAll("line")).toHaveLength(0);
    expect(document.body.classList.contains("custom-cursor-active")).toBe(false);
  });
});
