import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Card surface tones — chosen at the call site via `tone` prop.
 * `default` matches upstream shadcn (card token + ring).
 * `elevated` is the dark indigo "settings group" surface.
 * `hero`     is the brand-gradient surface used on profile/marketing.
 * `flat`     drops ring + bg, used when the card is purely structural.
 */
const cardVariants = cva(
  "group/card flex flex-col gap-4 overflow-hidden rounded-xl py-4 text-sm has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  {
    variants: {
      tone: {
        default: "bg-card text-card-foreground ring-1 ring-foreground/10",
        elevated: "bg-bg-elevated text-white ring-0 rounded-2xl",
        // Profile/marketing hero — Persian-Indigo → Lavender brand gradient.
        // Replaces inline `style={{ background: "linear-gradient(...)" }}` overrides.
        gradient:
          "text-white ring-0 rounded-3xl bg-[linear-gradient(135deg,#5524F5_0%,#9F76EA_70%,#BC96FF_100%)]",
        // Profile-detail bio card — sits over the photo header with a
        // subtle "lifted off the photo" overlap shadow (token).
        overlap: "bg-bg-indigo text-white ring-0 rounded-3xl shadow-card-overlap",
        // Verify-tier card — the inset ring color comes from a CSS var
        // (`--tier-color`) that the consumer sets per-row, so a single
        // variant covers bronze/silver/gold without 3 cva entries.
        // Use `state="inactive"` for the "next" tier rendering.
        tier: "bg-bg-elevated text-white rounded-3xl shadow-tier-active",
        tierInactive:
          "bg-bg-elevated text-white rounded-3xl shadow-tier-inactive",
        hero: "text-white ring-0 rounded-3xl",
        flat: "bg-transparent text-white ring-0",
      },
    },
    defaultVariants: { tone: "default" },
  }
)

function Card({
  className,
  size = "default",
  tone,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(cardVariants({ tone }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
