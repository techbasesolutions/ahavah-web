import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Custom tailwind-merge configuration for Ahavah's typography tokens.
 *
 * Tailwind v4 generates `text-display`, `text-h1`, `text-h2`, `text-h3`,
 * `text-body`, `text-body-strong`, `text-meta`, `text-caption`, `text-overline`
 * from `--text-*` tokens in @theme. These set font-size + line-height +
 * letter-spacing + weight — but tailwind-merge's default config collapses
 * EVERY `text-*` utility into one group, so a typography token (e.g.
 * `text-body`) wins over a color (`text-primary-foreground`) and the
 * color is silently dropped.
 *
 * We move the typography pairings into their own `font-size` group entry
 * so they no longer conflict with `text-{color}` utilities.
 */
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "body", "body-strong", "meta", "caption", "overline"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}
