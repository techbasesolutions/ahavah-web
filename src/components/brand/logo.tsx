"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useTheme, resolveTheme } from "@/lib/theme";

type Variant = "horizontal" | "stacked";

/**
 * Native viewBox aspect ratios from /public/brand/*.svg (Logos Final,
 * 2026-05-19 — earlier "Logos v2" rendered "Ahava" without the trailing
 * h; replaced with corrected 6-letter wordmark).
 *   horizontal: 518×145 → ~3.57:1   (full lockup, mark + AHAVAH wordmark)
 *   stacked:    343×238 → ~1.44:1   (mark above, AHAVAH wordmark below)
 */
const RATIO = {
  horizontal: 518 / 145,
  stacked: 343 / 238,
} as const;

const SIZE_HEIGHT = {
  sm: 28,
  md: 40,
  lg: 56,
  xl: 80,
} as const;

type Props = {
  variant?: Variant;
  size?: keyof typeof SIZE_HEIGHT;
  height?: number;
  forceTheme?: "light" | "dark";
  className?: string;
  alt?: string;
  priority?: boolean;
};

/**
 * Canonical Ahavah lockup. Picks the right SVG variant for the active
 * theme via `useTheme()` so the asset matches the resolved theme on the
 * client. SSR defaults to dark (matches `theme.ts` SSR default) to avoid
 * a flash; flipping to light on hydration is instantaneous because the
 * other variant is preloaded.
 *
 * Plain <img> not next/image — next/image refuses SVG sources by default
 * in Next 16 (security policy). Enabling `dangerouslyAllowSVG` site-wide
 * to support two static brand assets is the wrong trade-off.
 */
export function Logo({
  variant = "horizontal",
  size = "md",
  height,
  forceTheme,
  className,
  alt = "Ahavah",
  priority,
}: Props) {
  const h = height ?? SIZE_HEIGHT[size];
  const w = Math.round(h * RATIO[variant]);

  const { mode } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const themeResolved: "light" | "dark" = forceTheme
    ? forceTheme
    : mounted
      ? resolveTheme(mode)
      : "dark";

  const src = `/brand/ahavah-${variant}-${themeResolved}.svg`;
  const loading = priority ? "eager" : undefined;
  const fetchPriority = priority ? "high" : undefined;

  return (
    <img
      src={src}
      alt={alt}
      width={w}
      height={h}
      loading={loading}
      fetchPriority={fetchPriority}
      className={cn("block", className)}
      style={{ width: w, height: h }}
    />
  );
}
