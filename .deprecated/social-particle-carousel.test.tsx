import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SocialParticleCarousel } from "./social-particle-carousel";

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  mockMatchMedia(false);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const ORDER = [
  { name: "LinkedIn", href: "https://linkedin.com/in/oliver-straus-06804240b" },
  { name: "GitHub", href: "https://github.com/oliverstraus246-beep" },
  { name: "X", href: "https://x.com/OLIVER_STRAUS1" },
  { name: "Instagram", href: "https://instagram.com/oliver__straus" },
];

describe("SocialParticleCarousel", () => {
  it("starts on LinkedIn with a real, safe external link", () => {
    render(<SocialParticleCarousel />);
    const link = screen.getByRole("link", { name: "LinkedIn" });
    expect(link).toHaveAttribute("href", ORDER[0]!.href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toEqual(expect.stringContaining("noopener"));
    expect(link.getAttribute("rel")).toEqual(expect.stringContaining("noreferrer"));
  });

  it("cycles forward through all 4 platforms in order and wraps around", () => {
    render(<SocialParticleCarousel />);
    const next = screen.getByRole("button", { name: "Next social link" });
    for (let i = 1; i <= ORDER.length; i++) {
      fireEvent.click(next);
      const expected = ORDER[i % ORDER.length]!;
      expect(screen.getByRole("link", { name: expected.name })).toHaveAttribute(
        "href",
        expected.href,
      );
    }
  });

  it("cycles backward and wraps around", () => {
    render(<SocialParticleCarousel />);
    const prev = screen.getByRole("button", { name: "Previous social link" });
    fireEvent.click(prev);
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
  });

  it("hides the decorative canvas from assistive tech", () => {
    const { container } = render(<SocialParticleCarousel />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  it("does not throw when the pointer moves over the visual", () => {
    const { container } = render(<SocialParticleCarousel />);
    const wrap = container.querySelector("canvas")!.parentElement!;
    expect(() => {
      fireEvent.mouseMove(wrap, { clientX: 20, clientY: 20 });
    }).not.toThrow();
  });

  it("works the same for prefers-reduced-motion users, just without auto-rotation", () => {
    mockMatchMedia(true);
    render(<SocialParticleCarousel />);
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next social link" }));
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
  });
});
