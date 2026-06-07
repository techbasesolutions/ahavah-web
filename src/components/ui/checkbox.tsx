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
        // WCAG 1.4.11 3:1 UI contrast against the dark --app surface
        // (visual: the Terms checkbox on sign-up was nearly invisible
        // until checked). Bumping the unchecked border to a 0.30 white
        // and adding a 1.5px stroke makes the affordance obvious in
        // dark mode without disturbing the checked state, which still
        // uses the `data-checked:` lavender. The bg stays --card so
        // the box reads as a distinct surface from the page canvas.
        elevated:
          "border-[1.5px] border-white/35 dark:border-white/35 bg-(--card) hover:border-white/55 dark:hover:border-white/55",
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
