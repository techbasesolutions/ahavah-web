"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

/**
 * Checkbox tones — `default` keeps the upstream shadcn input border (used
 * inside Card/elevated surfaces where the kit border-input contrast is
 * already adequate); `elevated` is the dark-canvas variant used on
 * `bg-indigo` surfaces (welcome, sign-up, settings) where border-input
 * would render dark-on-dark and fail WCAG 1.4.11 3:1 UI contrast.
 *
 * Pair with `Label` + `htmlFor` for an accessible click-through-label.
 */
const checkboxVariants = cva(
  "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
  {
    variants: {
      tone: {
        default: "border-input dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        // 2026-05-18: migrated from `border-white/30 bg-bg-elevated`
        // (dark-only — invisible white border on white in light mode) to
        // theme-aware hairline + card tokens.
        //
        // 2026-06-07: --hairline is rgba(255,255,255,0.08) which fails
        // WCAG 1.4.11 3:1 UI contrast against the dark --app surface.
        // 2026-06-08: previous fix used `border-white/35` in BOTH modes
        // which made the box invisible in LIGHT mode (white border on
        // white canvas). Sign-up is rendered light-themed; same checkbox
        // had to disappear on /auth/sign-up while staying visible on
        // dark surfaces. Theme-aware borders fix both:
        //   light mode: zinc-800/40 = dark-ish on cream → visible
        //   dark mode:  white/35    = light on dark indigo → visible
        elevated:
          "border-[1.5px] border-zinc-800/40 dark:border-white/35 bg-(--card) hover:border-zinc-800/60 dark:hover:border-white/55",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

function Checkbox({
  className,
  tone,
  ...props
}: CheckboxPrimitive.Root.Props & VariantProps<typeof checkboxVariants>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ tone }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
