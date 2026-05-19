"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  // Focus indicator: white outline + 2px offset (same pattern as Button) —
  // ensures the keyboard-focus ring is visible on every brand surface
  // (lime/lavender/pink/elevated). Replaces the lime-on-lime invisibility
  // of the upstream `focus-visible:ring-ring/50` default.
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white! disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Upstream shadcn defaults — kept for adherence.
        default:
          "bg-transparent hover:bg-muted hover:text-foreground aria-pressed:bg-muted data-[state=on]:bg-muted",
        outline:
          "border border-input bg-transparent hover:bg-muted aria-pressed:bg-muted data-[state=on]:bg-muted",
        // ----- Ahavah brand: lime active fill, elevated rest. -------------
        // Replaces the old per-instance pattern of nullifying the default
        // `data-[state=on]:bg-muted` and re-painting via conditional className.
        // 2026-05-18: rest state migrated from `bg-bg-elevated text-white
        // border-white/10` (dark-only — text invisible on the white
        // bg-elevated in light mode) to theme-aware --card / --ink /
        // --hairline tokens. Active state unchanged (lime + black).
        brand:
          "bg-(--card) text-(--ink) border-[1.5px] border-(--hairline) hover:bg-(--app) aria-pressed:bg-lime aria-pressed:text-black aria-pressed:border-lime data-[state=on]:bg-lime data-[state=on]:text-black data-[state=on]:border-lime",
        // ----- Pill: same brand colours, full-radius shape. ----------------
        // Per Dateasy ref #12 (filters drawer): "Looking for" / "Show me"
        // pills are rounded-full, NOT rounded-lg. Pair with `size="tap"` for
        // mobile-friendly touch targets (44px).
        pill:
          "rounded-full bg-(--card) text-(--ink) border-[1.5px] border-(--hairline) hover:bg-(--app) aria-pressed:bg-lime aria-pressed:text-black aria-pressed:border-lime data-[state=on]:bg-lime data-[state=on]:text-black data-[state=on]:border-lime",
      },
      size: {
        default:
          "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // Tier-card style (paywall): vertical column, generous internal padding.
        tier: "h-auto flex-1 flex-col gap-1 rounded-2xl px-3 py-4",
        // Touch-target size — 44px iOS-min, generous horizontal padding for
        // text-pill content. Pair with `variant="pill"` for filter rows.
        tap: "h-tap min-w-tap px-5 text-meta has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
