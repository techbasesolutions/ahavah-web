import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Default radius is `rounded-full` — every Ahavah badge is a pill (compat
  // %, unread counts, NEW flags, status). Was `rounded-4xl` upstream which
  // forced 8+ call sites to add `className="... rounded-full"` to coerce
  // the visually-identical full-pill shape; default makes that override
  // unnecessary.
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // ----- Ahavah brand pills (compatibility / verification / new) -----
        lime:            "bg-lime text-black",
        lavender:        "bg-lavender text-black",
        lavenderOutline: "border-lavender bg-transparent text-lavender hover:bg-white/5",
        pink:            "bg-pink text-black",
        success:         "bg-success text-black",
        // Reads its bg from the nearest `--tier-color` CSS variable
        // (set by Card.tone="tier"/"tierInactive"). Use inside a tier Card.
        tier:            "bg-(--tier-color) text-black",
      },
      size: {
        // shadcn upstream: h-5 px-2 — kept as default for adherence.
        default: "h-5 px-2 py-0.5",
        // Pills inside cards (compat-percent, NEW, status badges)
        md: "h-7 px-3 text-caption",
        lg: "h-8 px-3 text-meta",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: Omit<useRender.ComponentProps<"span">, "size"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  })
}

export { Badge, badgeVariants }
