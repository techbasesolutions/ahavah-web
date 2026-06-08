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
        // 2026-06-07: --hairline failed contrast on dark canvas.
        // 2026-06-08: arbitrary-width `border-[1.5px]` wasn't compiling
        // in the Tailwind v4 JIT for this surface -- computed border
        // width came back as 0px in production, the checkbox rendered
        // as a 20x20 invisible square. Switched to the plain utility
        // `border-2` (guaranteed to compile + ship) and bumped opacity
        // so the box reads at small sizes:
        //   light mode: zinc-700/60 (dark gray) on white --card
        //   dark mode:  white/50 on dark --card
        // Background also pinned to white in light + --card in dark so
        // the affordance is a distinct surface from the page canvas
        // (was invisibly tied to --card alone, which is white in
        // light mode anyway -- belt-and-braces).
        elevated:
          // `border-solid` is REQUIRED with `border-2` in Tailwind v4:
          // the .border-2 rule sets `border-style: var(--tw-border-style)`
          // which falls back to `none` if --tw-border-style isn't
          // initialized for the element. Without border-solid the box
          // has width 2px but invisible border-style:none -> renders
          // as nothing. Diagnosed by curl'ing the deployed CSS bundle.
          "border-2 border-solid border-zinc-700/60 dark:border-white/50 bg-white dark:bg-(--card) hover:border-zinc-700/80 dark:hover:border-white/70",
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
