import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Card surface tones — chosen at the call site via `tone` prop.
 * `default`     — bg-card + border-subtle + radius-lg (spec §Card default)
 * `elevated`    — same + shadow-md (spec §Card elevated)
 * `gradient`    — Persian-Indigo→Lavender, white text, no border (spec §Card gradient)
 * `overlap`     — bg-app + radius-3xl top corners + inverse shadow (spec §Card overlap)
 * `tier-active` — use `tier` prop (bronze|silver|gold) for inset ring (spec §Card tier-active)
 * `hero`        — brand-gradient surface (legacy alias; prefer gradient)
 * `flat`        — structural wrapper, no bg/border
 */
const cardVariants = cva(
  "group/card flex flex-col gap-4 overflow-hidden rounded-xl py-4 text-sm has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  {
    variants: {
      tone: {
        default: "bg-card text-card-foreground ring-1 ring-foreground/10",
        // 2026-05-18: rest tones migrated from `bg-bg-elevated text-white`
        // (dark-only — the Tailwind utility `bg-bg-elevated` inlines the
        // dark @theme value at build time and never responds to
        // `[data-theme=light]`) to theme-aware `bg-(--card) text-(--ink)`.
        elevated: "bg-(--card) text-(--ink) ring-0 rounded-2xl",
        // Spec §Card gradient: Persian-Indigo → Lavender, white text, no border.
        // Uses CSS var tokens so they resolve correctly in both themes.
        gradient:
          "border-0 text-white ring-0 rounded-3xl bg-[linear-gradient(135deg,var(--color-indigo)_0%,var(--color-lavender)_100%)]",
        // Spec §Card overlap: bg-app + radius-3xl top corners + inverse-direction shadow.
        // `-mt-6` offsets card over photo bottom edge (consumer may override).
        overlap:
          "bg-[var(--bg-app)] text-[var(--fg-default)] ring-0 rounded-t-3xl rounded-b-xl -mt-6 shadow-[0_-8px_24px_rgba(0,0,0,0.20)]",
        // Spec §Card tier-active: inset ring via `tier` prop (bronze/silver/gold).
        // `tier-active` is handled by the `tier` variant below; this tone is
        // preserved as a no-op base — the actual ring is applied by the `tier` variant.
        "tier-active": "bg-(--card) text-(--ink) rounded-3xl",
        // Legacy aliases kept for backward compat; migrate callers to gradient/tier-active.
        tier: "bg-(--card) text-(--ink) rounded-3xl shadow-tier-active",
        tierInactive:
          "bg-(--card) text-(--ink) rounded-3xl shadow-tier-inactive",
        hero: "text-(--ink) ring-0 rounded-3xl",
        flat: "bg-transparent text-(--ink) ring-0",
      },
      // Spec §Card tier-active: `inset 0 0 0 1.5px var(--color-{tier})`
      // Applied on top of any `tone`. Works standalone or with tone="tier-active".
      tier: {
        none: "",
        bronze:
          "shadow-[inset_0_0_0_1.5px_var(--color-bronze)]",
        silver:
          "shadow-[inset_0_0_0_1.5px_var(--color-silver)]",
        gold:
          "shadow-[inset_0_0_0_1.5px_var(--color-gold)]",
      },
    },
    defaultVariants: { tone: "default", tier: "none" },
  }
)

function Card({
  className,
  size = "default",
  tone,
  tier,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(cardVariants({ tone, tier }), className)}
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
