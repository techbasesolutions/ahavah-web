import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Input variants — `size` controls height/padding/radius scale,
 * `tone` controls surface (transparent vs elevated dark fill).
 * Body text size is locked to 16px on mobile (text-body) regardless of
 * size variant, to prevent iOS auto-zoom on focus (mobile-responsive skill).
 */
const inputVariants = cva(
  "w-full min-w-0 border bg-transparent transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: "h-8 rounded-lg px-2.5 py-1 text-base md:text-sm",
        sm: "h-7 rounded-md px-2 py-1 text-sm",
        lg: "h-input rounded-2xl px-5 py-3 text-body",
      },
      tone: {
        default: "border-input",
        // Subtle 1px white/10 border carries the input boundary when the
        // bg-bg-elevated fill alone is too close to the page bg-indigo to
        // satisfy WCAG 3:1 UI contrast. Focus-visible (handled in the base
        // string) replaces border-color with --ring.
        elevated: "border-white/10 bg-bg-elevated! text-white placeholder:text-text-muted",
      },
    },
    defaultVariants: {
      size: "default",
      tone: "default",
    },
  }
)

function Input({
  className,
  type,
  size,
  tone,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, tone }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
