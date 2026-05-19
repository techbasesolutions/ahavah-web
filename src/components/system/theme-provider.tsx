"use client"

import { useEffect } from "react"
import { getInitialTheme, setTheme } from "@/lib/theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mode = getInitialTheme()
    setTheme(mode)
    // "auto" is the boot-time default only; the binary toggle never reselects it.
    // If a future 3-way picker reintroduces "auto", remount the provider to re-attach the MQL listener.
    if (mode === "auto") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)")
      const onChange = () => setTheme("auto")
      mql.addEventListener("change", onChange)
      const onCustom = (e: Event) => {
        const next = (e as CustomEvent<string>).detail
        if (next !== "auto") mql.removeEventListener("change", onChange)
      }
      window.addEventListener("ahavah-theme-change", onCustom)
      return () => {
        mql.removeEventListener("change", onChange)
        window.removeEventListener("ahavah-theme-change", onCustom)
      }
    }
  }, [])
  return <>{children}</>
}
