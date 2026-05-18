import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Textarea variants — mirrors Input's API so the two interchange in forms.
 * `size` controls height/padding/radius; `tone` controls surface (transparent
 * vs elevated dark fill). `text-body` (16px) is locked across sizes to
 * prevent iOS auto-zoom on focus.
 */
const textareaVariants = cva(
  "flex field-sizing-content min-h-16 w-full border bg-transparent transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: "rounded-lg px-2.5 py-2 text-base md:text-sm",
        sm: "rounded-md px-2 py-1.5 text-sm",
        lg: "rounded-2xl px-5 py-4 text-body",
      },
      tone: {
        default: "border-input",
        // See Input.tone='elevated' — same boundary-contrast rationale.
        elevated: "border-white/10 bg-bg-elevated! text-white placeholder:text-(--ink-3)",
      },
    },
    defaultVariants: {
      size: "default",
      tone: "default",
    },
  }
)

function Textarea({
  className,
  size,
  tone,
  ...props
}: Omit<React.ComponentProps<"textarea">, "size"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ size, tone }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
