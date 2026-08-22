import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "./button"

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
  })

  it("applies the requested variant as a data attribute", () => {
    render(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "outline")
  })
})
