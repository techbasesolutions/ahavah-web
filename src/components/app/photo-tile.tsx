"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * PhotoTile — fixed-aspect rounded photo container used by profile photo
 * grids (edit profile, profile detail, future onboarding photo upload).
 *
 * `aspect="3/4"` is the dating-app idiom (matches /onboarding/photos
 * dashed-tile slots and /matches grid cards). `aspect="4/5"` for the bigger
 * deck cards.
 *
 * The photo background can be a CSS `background-image` value (gradient,
 * `url(...)`, etc.) — passed via the `bg` prop and applied via the
 * `--photo-bg` CSS variable. Falls back to a flat surface if `bg` is
 * undefined.
 *
 * Children render OVER the photo (e.g. remove-button affordance, caption
 * scrim). The tile is `relative` so absolute children can be positioned.
 */
const photoTileVariants = cva(
  "relative overflow-hidden bg-cover bg-center",
  {
    variants: {
      aspect: {
        "3/4": "aspect-3/4",
        "4/5": "aspect-4/5",
        square: "aspect-square",
      },
      radius: {
        // Full-bleed (e.g. profile-detail hero photo, where the photo
        // extends edge-to-edge and an overlap-card curves over its bottom).
        none: "rounded-none",
        md: "rounded-xl",
        lg: "rounded-2xl",
        xl: "rounded-3xl",
      },
      surface: {
        // No fallback (photo always present)
        none: "",
        // Elevated dark surface — matches the photo-skeleton placeholder
        // (Skeleton uses bg-muted; PhotoTile fallback should match
        // bg-bg-elevated to feel like the same kit).
        elevated: "bg-bg-elevated",
      },
    },
    defaultVariants: {
      aspect: "3/4",
      radius: "lg",
      surface: "elevated",
    },
  },
);

type PhotoTileProps = React.ComponentProps<"div"> &
  VariantProps<typeof photoTileVariants> & {
    /** CSS background-image value: a gradient, `url(...)`, etc. */
    bg?: string;
  };

export function PhotoTile({
  className,
  aspect,
  radius,
  surface,
  bg,
  style,
  children,
  ...props
}: PhotoTileProps) {
  return (
    <div
      data-slot="photo-tile"
      className={cn(photoTileVariants({ aspect, radius, surface }), className)}
      style={
        bg
          ? ({
              "--photo-bg": bg,
              backgroundImage: "var(--photo-bg)",
              ...style,
            } as React.CSSProperties)
          : style
      }
      {...props}
    >
      {children}
    </div>
  );
}
