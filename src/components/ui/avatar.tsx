"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Avatar size ladder — drives the root size AND the fallback typography
// (via group-data selectors below). When you want a 56px avatar, write
// `<Avatar size="tap-xl">`; never `<Avatar className="size-14">`. The
// matching fallback initial automatically scales to text-h3 — no manual
// `<AvatarFallback className="text-h3">` per call site.
//
// Sizes resolve to spacing tokens where they exist (--spacing-tap-{lg,xl,2xl})
// to keep avatars on the same tap-target rhythm as Buttons / IconBadges.
const avatarVariants = cva(
  "group/avatar relative flex shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
  {
    variants: {
      size: {
        xs:        "size-7",         // 28px — chat them-bubble, verified-badge
        sm:        "size-8",         // 32px — kit default
        md:        "size-10",        // 40px — small list rows
        tap:       "size-tap",       // 44px — iOS-min tap target
        "tap-lg":  "size-tap-lg",    // 48px — chat header, story-row sm
        "tap-xl":  "size-tap-xl",    // 56px — matches list, story-row md
        "tap-2xl": "size-tap-2xl",   // 64px — profile hero
        full:      "size-full",      // fills parent (StoryAvatar inner)
      },
    },
    defaultVariants: { size: "sm" },
  },
)

const avatarFallbackVariants = cva(
  // Auto-typography per parent size — group-data selectors below read the
  // Avatar's data-size attr and pick the matching text token. Means call
  // sites never set per-instance text-* on AvatarFallback.
  "flex size-full items-center justify-center rounded-full text-meta group-data-[size=xs]/avatar:text-caption group-data-[size=sm]/avatar:text-caption group-data-[size=md]/avatar:text-meta group-data-[size=tap]/avatar:text-meta group-data-[size=tap-lg]/avatar:text-meta group-data-[size=tap-xl]/avatar:text-h3 group-data-[size=tap-2xl]/avatar:text-h2",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        // Ahavah brand: indigo tile with lime initial — used everywhere a
        // user's photo is unavailable. Replaces per-instance bg/color overrides.
        brand: "bg-bg-indigo text-lime font-bold",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Avatar({
  className,
  size = "sm",
  ...props
}: AvatarPrimitive.Root.Props & VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  variant,
  ...props
}: AvatarPrimitive.Fallback.Props & VariantProps<typeof avatarFallbackVariants>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(avatarFallbackVariants({ variant }), className)}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        // Per-size dot scaling — keys match the Avatar size variants above.
        "group-data-[size=xs]/avatar:size-1.5 group-data-[size=xs]/avatar:[&>svg]:hidden",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=md]/avatar:size-2.5 group-data-[size=md]/avatar:[&>svg]:size-2",
        "group-data-[size=tap]/avatar:size-3 group-data-[size=tap]/avatar:[&>svg]:size-2",
        "group-data-[size=tap-lg]/avatar:size-3 group-data-[size=tap-lg]/avatar:[&>svg]:size-2",
        "group-data-[size=tap-xl]/avatar:size-3 group-data-[size=tap-xl]/avatar:[&>svg]:size-2",
        "group-data-[size=tap-2xl]/avatar:size-3.5 group-data-[size=tap-2xl]/avatar:[&>svg]:size-2.5",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=md]/avatar-group:size-10 group-has-data-[size=xs]/avatar-group:size-7 [&>svg]:size-4 group-has-data-[size=md]/avatar-group:[&>svg]:size-5 group-has-data-[size=xs]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
  avatarVariants,
  avatarFallbackVariants,
}
