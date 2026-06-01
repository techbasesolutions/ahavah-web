import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BlurredAvatar } from "@/components/app/blurred-avatar"

describe("BlurredAvatar", () => {
  it("renders a lavender frosted silhouette with a Lock icon", () => {
    render(<BlurredAvatar aria-label="Hidden like" />)
    const el = screen.getByLabelText("Hidden like")
    expect(el).toBeInTheDocument()
    expect(el.querySelector("svg")).toBeInTheDocument() // Lock icon
  })

  it("accepts size variants", () => {
    const { rerender } = render(<BlurredAvatar size="md" aria-label="x" />)
    rerender(<BlurredAvatar size="lg" aria-label="x" />)
    expect(screen.getByLabelText("x")).toBeInTheDocument()
  })
})
