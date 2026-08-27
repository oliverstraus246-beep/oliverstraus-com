import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Cursor } from "./cursor";

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    // The cursor checks two different queries: prefers-reduced-motion (the
    // `reduced` arg controls this) and (hover: hover) (a real pointer is
    // present). A single `matches: reduced` value for every query made the
    // hover check false under the default reduced=false case, so the effect
    // bailed before adding the cursor class -- failing both activation
    // tests. Resolve hover queries to true regardless of the motion setting.
    matches: query.includes("hover") ? true : reduced,
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
    // Markup still renders (hydration-stable: server and reduced-motion
    // client produce the same hidden DOM) but stays hidden via opacity-0,
    // and the body never gets custom-cursor-active so the native cursor
    // remains. The effect that would reveal it never runs under reduced
    // motion.
    expect(document.body.classList.contains("custom-cursor-active")).toBe(false);
    expect(container.querySelector("[class*='opacity-0']")).not.toBeNull();
  });
});
