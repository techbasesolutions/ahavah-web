import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * IconBadge — small rounded-square tile that frames an icon.
 *
 * Used for settings rows, list-item leading icons, badge clusters where the
 * icon needs a tinted backplate distinct from the surrounding card.
 *
 * Why this exists: the same pattern (`bg-{tone}/10 text-{tone}` on a
 * `size-9 rounded-xl` span) was repeated across every settings row in
 * /profile. Pulling it into a cva variant makes the per-row conditional
 * a `tone={destructive ? "destructive" : "brand"}` prop instead of
 * `cn(destructive ? "bg-pink/10" : "bg-lavender/10")`.
 */
const iconBadgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center",
  {
    variants: {
      tone: {
        brand:       "bg-lavender/10 text-lavender",
        destructive: "bg-pink/10     text-pink",
        success:     "bg-success/10  text-success",
        muted:       "bg-white/5     text-(--ink-3)",
        // Solid lime check pill (paywall feature list, etc.) — NOT the
        // 10%-tint pattern of the other tones; this one IS the badge colour.
        cta:         "bg-lime text-black",
        // 2026-05-18: bg-bg-elevated + text-white → theme-aware tokens.
        // The icon brings its own colour (SparkleMark `color` prop) so
        // text-(--ink) is mostly a fallback for any text content.
        elevated:    "bg-(--card) text-(--ink)",
        // Reads its bg from the nearest `--tier-color` CSS variable (set
        // by Card.tone="tier"/"tierInactive"). Used inside tier Cards
        // (verify) for the bronze/silver/gold icon tile.
        tier:        "bg-(--tier-color) text-black",
        // Outlined inversion of `tier`: bg-canvas with a thin tier-color
        // inset ring + tier-color content (text/number/icon). Used by the
        // verify-tier-shell timeline steps as the numbered badge ("1", "2"
        // etc.) — text content instead of an icon, so the tier color
        // surfaces as the ring + the numeral.
        // 2026-05-18: bg-bg-canvas inlines dark value; switched to bg-(--canvas)
        // which IS theme-aware (defined outside @theme).
        tierOutlined:
          "bg-(--canvas) text-(--tier-color) ring-[1.5px] ring-inset ring-(--tier-color)",
      },
      // Square (rounded-xl) is the kit default for icon tiles; circle
      // (rounded-full) is for round affordances (paywall checks, hero
      // sparkle pedestal, future status dots).
      shape: {
        square: "rounded-xl",
        circle: "rounded-full",
      },
      size: {
        xs:   "size-6  [&_svg]:size-3",       // 24px — small inline check
        sm:   "size-7  [&_svg]:size-3.5",     // 28px
        md:   "size-9  [&_svg]:size-4",       // 36px — default settings row
        lg:   "size-11 [&_svg]:size-5",       // 44px
        xl:   "size-12 [&_svg]:size-6",       // 48px — verify tier tile
        "2xl":"size-16 [&_svg]:size-8",       // 64px — verify tier hero
        hero: "size-40 [&_svg]:size-22",      // 160px — onboarding sparkle hero
      },
    },
    // Larger square tiles (xl, hero) use rounded-2xl rather than rounded-xl
    // — rounded-xl looks pinched at 48px+. tailwind-merge keeps the later
    // (compound) value when both rules apply to the same square.
    compoundVariants: [
      { shape: "square", size: "xl",   className: "rounded-2xl" },
      { shape: "square", size: "2xl",  className: "rounded-2xl" },
      { shape: "square", size: "hero", className: "rounded-2xl" },
    ],
    defaultVariants: { tone: "brand", shape: "square", size: "md" },
  }
)

function IconBadge({
  className,
  tone,
  size,
  shape,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof iconBadgeVariants>) {
  return (
    <span
      data-slot="icon-badge"
      className={cn(iconBadgeVariants({ tone, size, shape }), className)}
      {...props}
    >
      {children}
    </span>
  )
}

export { IconBadge, iconBadgeVariants }
