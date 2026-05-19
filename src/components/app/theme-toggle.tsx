"use client"

import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useTheme, resolveTheme } from "@/lib/theme"

type Props = {
  /**
   * - "switch" (default) — renders the kit <Switch> with optional "Theme"
   *   label. Used in settings rows where the toggle sits alongside other
   *   controls.
   * - "icon" — renders a kit <Button size="circle-lg" tone="elevated">
   *   with a Sun/Moon icon. Used as a header chrome control in the desktop
   *   topbar + as a floating top-left mobile control.
   */
  variant?: "switch" | "icon"
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({ variant = "switch", showLabel, className }: Props) {
  const { mode, setMode } = useTheme()
  const resolved = resolveTheme(mode)
  const isLight = resolved === "light"

  if (variant === "icon") {
    // Theme-aware styling using Tailwind v4 arbitrary CSS-var syntax
    // (`bg-(--card)`) so the bg flips correctly between themes:
    //   light → bg #FFFFFF, ink #0F0B1F
    //   dark  → bg oklch(0.13 0.06 280), ink #FFFFFF
    // We DON'T use tone="elevated" here — that variant maps to
    // `bg-bg-elevated`, a Tailwind utility on a token that's defined in
    // :root but NOT registered in @theme, so it doesn't theme-flip
    // through Tailwind's compile-time class generation.
    return (
      <Button
        size="circle-lg"
        variant="ghost"
        aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
        title={isLight ? "Switch to dark theme" : "Switch to light theme"}
        onClick={() => setMode(isLight ? "dark" : "light")}
        className={cn(
          "bg-(--card) text-(--ink) border border-(--hairline)",
          "hover:bg-(--app) hover:border-(--border)",
          "shadow-(--shadow-soft)",
          className,
        )}
      >
        {isLight ? (
          <Moon className="size-5" aria-hidden />
        ) : (
          <Sun className="size-5" aria-hidden />
        )}
      </Button>
    )
  }

  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      {showLabel && (
        <span className="text-sm text-(--ink-2)">Theme</span>
      )}
      <Switch
        aria-label="Theme"
        checked={isLight}
        onCheckedChange={(next) => setMode(next ? "light" : "dark")}
      />
    </label>
  )
}
