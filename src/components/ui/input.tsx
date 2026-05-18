import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Input variants — `size` controls height/padding/radius scale,
 * `tone` controls surface (bg-card default vs bg-app elevated).
 *
 * Sizes match spec Layer 2 · Input:
 *   sm  — 40px / radius-md / 14px font
 *   md  — 48px / radius-md / 16px font
 *   lg  — 56px / radius-lg / 16px font  ← default for forms
 *
 * Tones:
 *   default  — bg-card surface (white in light mode)
 *   elevated — bg-app surface (use inside a card to avoid surface clash)
 *
 * Error state:
 *   Pass `error={true}` to apply a 1.5px pink border (--color-pink).
 *   Helper / error text is the caller's responsibility — render a
 *   <p className="text-caption text-[var(--color-pink)]"> below the Input.
 *   Associate it via aria-describedby on the Input for accessibility.
 *
 * Body text size is locked to 16px on mobile regardless of size variant,
 * to prevent iOS auto-zoom on focus (mobile-responsive skill).
 */
const inputVariants = cva(
  // 2026-05-17: border-width fixed at 1.5px at rest AND on focus.
  // Previously the cva changed border-width from 1px (default `border`)
  // to 1.5px on focus-visible, which caused a 0.5px sub-pixel jitter at
  // the input's edges (visible as a "clipped stroke" on focus). Now only
  // the border-COLOR changes on focus — width is constant so no layout
  // shift, no anti-aliasing artifacts, no apparent clipping. Spec
  // (design-system-v2.md §Input) says "border IS the focus" — width-
  // change was implementation choice, not a spec requirement.
  "w-full min-w-0 [border-width:1.5px] border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--fg-default)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--fg-subtle)] hover:border-[var(--border-default)] focus-visible:border-[var(--color-lavender)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        // sm: 40px height — compact form rows, search bars
        sm: "h-10 rounded-[var(--radius-md)] px-3 py-2 text-[14px]",
        // md: 48px height — standard density
        md: "h-12 rounded-[var(--radius-md)] px-4 py-2.5 text-base",
        // lg: 56px height — primary form default (matches --size-tap-xl)
        lg: "h-14 rounded-[var(--radius-lg)] px-5 py-3 text-base",
      },
      tone: {
        // default: bg-card (white in light / dark card in dark)
        default: "border-[var(--border-subtle)]",
        // elevated: bg-app surface — use inside a card to avoid surface clash.
        // Subtle border carries boundary where bg-app is close to bg-card.
        elevated: "border-[var(--border-subtle)] bg-[var(--bg-app)]!",
      },
      // error: applies 1.5px pink border per spec.
      // Helper text is caller's responsibility (see JSDoc above).
      error: {
        true: "[border-width:1.5px] border-[var(--color-pink)] hover:border-[var(--color-pink)] focus-visible:border-[var(--color-pink)]",
        false: "",
      },
    },
    defaultVariants: {
      size: "lg",
      tone: "default",
      error: false,
    },
  }
)

function Input({
  className,
  type,
  size,
  tone,
  error,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-error={error ? "true" : undefined}
      className={cn(inputVariants({ size, tone, error }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
