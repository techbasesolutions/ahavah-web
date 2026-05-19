"use client"

import { useSyncExternalStore } from "react"

export type ThemeMode = "light" | "dark" | "auto"

const STORAGE_KEY = "ahavah-theme"
// `auto` follows the OS preference, NOT viewport width. The previous
// MQ "(min-width: 768px)" was a copy/paste bug: it served light on
// desktop and dark on mobile regardless of system theme. Fixed
// 2026-05-18 — auto now honours prefers-color-scheme.
const MQ = "(prefers-color-scheme: dark)"

function resolveAuto(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia(MQ).matches ? "dark" : "light"
}

function apply(mode: ThemeMode) {
  if (typeof document === "undefined") return
  const resolved = mode === "auto" ? resolveAuto() : mode
  document.documentElement.dataset.theme = resolved
}

export function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "auto"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark" || stored === "auto") return stored
  return "auto"
}

// Module-level cache — avoids repeated localStorage reads under concurrent rendering.
// Initialized eagerly on the client (theme.ts is only imported by "use client" components).
let _cached: ThemeMode = typeof window === "undefined" ? "auto" : getInitialTheme()

export function setTheme(mode: ThemeMode) {
  if (typeof window !== "undefined") {
    _cached = mode
    window.localStorage.setItem(STORAGE_KEY, mode)
    window.dispatchEvent(new CustomEvent("ahavah-theme-change", { detail: mode }))
  }
  apply(mode)
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode === "auto" ? resolveAuto() : mode
}

function subscribe(cb: () => void) {
  const onStorage = () => {
    _cached = getInitialTheme()
    cb()
  }
  const onCustom = () => {
    _cached = getInitialTheme()
    cb()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener("ahavah-theme-change", onCustom)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("ahavah-theme-change", onCustom)
  }
}

export function useTheme() {
  const mode = useSyncExternalStore<ThemeMode>(
    subscribe,
    () => _cached,
    () => "auto"
  )
  return {
    mode,
    setMode: (m: ThemeMode) => setTheme(m),
  }
}
