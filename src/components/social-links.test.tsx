import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialLinks } from "./social-links";

describe("SocialLinks", () => {
  it("renders all four platforms as real external links", () => {
    render(<SocialLinks />);
    const linkedin = screen.getByRole("link", { name: "LinkedIn" });
    expect(linkedin).toHaveAttribute(
      "href",
      "https://linkedin.com/in/oliver-straus-06804240b",
    );
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "GitLab" })).toHaveAttribute(
      "href",
      "https://gitlab.com/oliverstraus",
    );
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute(
      "href",
      "https://x.com/OLIVER_STRAUS1",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/oliver__straus",
    );
  });
});
