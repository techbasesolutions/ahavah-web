import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useTheme, setTheme, getInitialTheme } from "@/lib/theme"

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute("data-theme")
})

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute("data-theme")
})

describe("theme", () => {
  it("getInitialTheme defaults to 'auto' when nothing is stored", () => {
    expect(getInitialTheme()).toBe("auto")
  })

  it("getInitialTheme reads a persisted value", () => {
    localStorage.setItem("ahavah-theme", "light")
    expect(getInitialTheme()).toBe("light")
  })

  it("setTheme('light') writes data-theme=light on <html> and persists", () => {
    setTheme("light")
    expect(document.documentElement.dataset.theme).toBe("light")
    expect(localStorage.getItem("ahavah-theme")).toBe("light")
  })

  it("setTheme('dark') writes data-theme=dark on <html> and persists", () => {
    setTheme("dark")
    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(localStorage.getItem("ahavah-theme")).toBe("dark")
  })

  it("setTheme('auto') resolves to dark below md and light at md+", () => {
    // jsdom default is 1024 wide -> matches min-width: 768px -> light
    setTheme("auto")
    expect(document.documentElement.dataset.theme).toBe("light")
    expect(localStorage.getItem("ahavah-theme")).toBe("auto")
  })

  it("useTheme reflects setTheme updates", () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setMode("dark"))
    expect(result.current.mode).toBe("dark")
    expect(document.documentElement.dataset.theme).toBe("dark")
  })
})
