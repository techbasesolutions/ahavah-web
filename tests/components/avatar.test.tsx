import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { nameGradient } from "@/components/ui/avatar"

it("name-gradient fallback is deterministic for the same initial", () => {
  const a = render(<Avatar><AvatarFallback variant="name-gradient">A</AvatarFallback></Avatar>)
  const b = render(<Avatar><AvatarFallback variant="name-gradient">A</AvatarFallback></Avatar>)
  // className is stable (same cva variant), and inline backgroundImage is deterministic
  const elA = a.container.querySelector("[data-slot='avatar-fallback']") as HTMLElement
  const elB = b.container.querySelector("[data-slot='avatar-fallback']") as HTMLElement
  expect(elA.className).toBe(elB.className)
  expect(elA.style.backgroundImage).toBe(elB.style.backgroundImage)
})

describe("nameGradient helper", () => {
  it("returns the same gradient for the same input", () => {
    expect(nameGradient("A")).toBe(nameGradient("A"))
  })

  it("returns a non-empty string", () => {
    expect(nameGradient("Z").length).toBeGreaterThan(0)
  })

  it("is stable across 6-slot boundary — charCode 0 and charCode 6 map to same slot", () => {
    const char0 = String.fromCharCode(0)
    const char6 = String.fromCharCode(6)
    expect(nameGradient(char0)).toBe(nameGradient(char6))
  })
})

describe("Avatar ring prop", () => {
  it("renders with lime ring class when ring=lime", () => {
    const { container } = render(<Avatar ring="lime" />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain("ring-[2.5px]")
    expect(root.className).toContain("ring-(--color-lime)")
  })

  it("renders without ring class by default", () => {
    const { container } = render(<Avatar />)
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toContain("ring-[2.5px]")
  })
})

describe("Avatar online prop", () => {
  it("renders an online dot when online=true", () => {
    const { container } = render(<Avatar online />)
    const dot = container.querySelector("[data-slot='avatar-online']")
    expect(dot).not.toBeNull()
  })

  it("does not render an online dot when online is omitted", () => {
    const { container } = render(<Avatar />)
    const dot = container.querySelector("[data-slot='avatar-online']")
    expect(dot).toBeNull()
  })
})
