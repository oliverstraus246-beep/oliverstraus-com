import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialLinks } from "./social-links";

describe("SocialLinks", () => {
  it("renders all three platforms as real external links", () => {
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
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/oliver__straus",
    );
    expect(screen.queryByRole("link", { name: "X" })).not.toBeInTheDocument();
  });
});
