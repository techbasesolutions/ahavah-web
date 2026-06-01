import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { ThemeToggle } from "@/components/app/theme-toggle"

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute("data-theme")
})

describe("ThemeToggle", () => {
  it("renders a kit Switch with an accessible label", () => {
    render(<ThemeToggle showLabel />)
    expect(screen.getByRole("switch", { name: /theme/i })).toBeInTheDocument()
  })

  it("toggling sets data-theme between light and dark and persists", () => {
    render(<ThemeToggle />)
    const sw = screen.getByRole("switch")
    fireEvent.click(sw)
    const after = document.documentElement.dataset.theme
    expect(after === "light" || after === "dark").toBe(true)
    expect(["light", "dark"]).toContain(localStorage.getItem("ahavah-theme"))
  })
})
