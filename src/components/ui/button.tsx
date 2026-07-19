import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Focus ring: white outline + 2px offset (offset = transparent gap that
  // exposes the canvas behind the button). White on bg-canvas (#000) gives
  // 21:1 contrast — passes WCAG 1.4.11 on every brand surface (lime CTA,
  // lavender pill, pink action, indigo card, elevated row).
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white! active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        // Subtle hairline outline for low-emphasis actions on dark surfaces
        // (chat "New conversation", verify "Get verified", etc.). Replaces the
        // ad-hoc `border-white/15 bg-transparent text-white hover:bg-white/5`.
        // 2026-05-18: migrated from `border-white/15 text-white hover:bg-white/5`
        // (dark-only — invisible on light bg) to theme-aware hairline + ink tokens.
        outlineSubtle:
          "border-(--hairline) bg-transparent text-(--ink) hover:bg-(--app)",
        // Tier-coloured BORDER + white body text. Use inside a Card that
        // sets --tier-color. The previous version painted body text in
        // --tier-color too, which made silver and gold buttons read as
        // disabled (text identical to background on dark surfaces).
        // Keeping tier signal via the ring; body stays alive in white.
        // 2026-05-18: text-(--ink) replaces text-white so the body text
        // stays legible whether the parent Card surface is dark (--ink=white)
        // or light (--ink=near-black). The tier-color ring still signals tier.
        outlineTier:
          "border bg-transparent border-(--tier-color) text-(--ink) hover:bg-(--tier-color)/10",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // ----- Brand tone (color overlay on top of variant) ------------------
      // Lets call sites stay variant="default" while painting a brand-colour
      // background. Used most heavily for round action buttons (Pass / Like /
      // Boost / Send) — replaces the ad-hoc `border-0 bg-{lavender|pink|lime}`
      // overrides that were duplicated across 9 call sites.
      tone: {
        none:     "",
        cta:      "border-0 bg-lime text-black hover:bg-lime/90",
        brand:    "border-0 bg-lavender text-black hover:bg-lavender/90",
        action:   "border-0 bg-pink text-black hover:bg-pink/90",
        // Persian Indigo (#5524F5, --color-indigo) brand fill + white icon.
        // Used for the /discover Rewind/Back circle. The brand indigo is
        // fixed in both themes (it does not flip in light mode), and white
        // on it is ~7:1 — AAA in light and dark.
        indigo:   "border-0 bg-indigo text-white hover:bg-indigo/90",
        // Super-like button: lavender fill + black icon — distinct from the
        // Play/Pause CTA (lime) so the four action-row circles each read as
        // a unique brand tone. Used ONLY in the desktop action row; the
        // mobile super button keeps its existing `tone="cta"` appearance.
        // Lavender is "brand-flavored secondary" (design-system §Button);
        // contrast audit: lavender + black = 8.4:1 ✓ (§1.3).
        // Migrated to tone="brand" in Task 1 (2026-05-17).
        // Translucent black scrim — for icon buttons sitting on top of photos
        // (back / more / image overlays). White icon, ~45% black bg.
        overlay:  "border-0 bg-black/45 text-white hover:bg-black/60",
        // Elevated dark fill (notifications bell, secondary chrome on canvas).
        // 2026-05-18: bg-bg-elevated → bg-(--card), text-white → text-(--ink).
        // The bg-bg-elevated utility inlines the dark-theme value at build
        // time and never honors the [data-theme=light] override.
        elevated: "border-0 bg-(--card) text-(--ink) hover:bg-(--card)/70",
        // Solid black — for small accent buttons sitting INSIDE a coloured
        // bubble (chat voice-message play). White/lavender icon.
        dark:     "border-0 bg-black text-white hover:bg-black/85",
      },
      // ----- Lift (shadow + tap-spring) ------------------------------------
      // Floating circular action buttons (swipe-deck Pass/Like/Boost) get a
      // visible lift + an active:scale-95 micro-interaction so the tap
      // registers physically. Inline buttons (chat Send, match Send) opt out
      // by leaving lift at its default.
      //
      // 2026-05-16 — `float` shadow rewritten from `shadow-lg` (Tailwind's
      // black drop-shadow tuned for light backgrounds) to a soft white glow
      // tuned for the indigo canvas. On dark surfaces a black shadow reads
      // as a literal dark frame around the button — exactly what users
      // flagged on /onboarding's "Continue" CTA. A low-alpha white glow
      // gives the same physical "lifted" cue without the dark halo, and
      // works against every brand surface (lime CTA, lavender brand,
      // pink action, dark elevated).
      lift: {
        none:  "",
        float:
          "shadow-[0_8px_24px_-4px_rgba(255,255,255,0.12),0_2px_8px_-2px_rgba(255,255,255,0.08)] transition-transform active:scale-95",
      },
      size: {
        // Upstream shadcn defaults — desktop-density. Used as-is for
        // adherence with the kit's intended baseline.
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        // ----- Ahavah mobile-first extensions ------------------------------
        // Touch-target sizes (44px+) — opt-in via explicit `size="tap"` etc.
        // Use these for any user-facing interactive surface on mobile.
        tap:        "h-tap gap-2 px-4 text-meta has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        "icon-tap": "size-tap [&_svg:not([class*='size-'])]:size-5",
        // Primary CTA — full-width, 56px, bold body, lg radius.
        // Full-pill CTA per operator ruling 2026-07-19 (audit Phase 2):
        // ds.jsx specified r16 but every recent design export draws
        // primary CTAs as full pills; the pill wins.
        cta: "h-cta w-full gap-2 px-6 text-body font-bold rounded-full [&_svg:not([class*='size-'])]:size-5",
        // Circular floating action / swipe-deck buttons.
        "circle-lg": "size-tap-lg rounded-full [&_svg:not([class*='size-'])]:size-5",
        "circle-xl": "size-tap-xl rounded-full [&_svg:not([class*='size-'])]:size-6",
        "circle-2xl": "size-tap-2xl rounded-full [&_svg:not([class*='size-'])]:size-7",
        // Tile / slot — consumer controls height (aspect-ratio, etc.).
        block: "h-auto w-full p-0 [&_svg:not([class*='size-'])]:size-5",
        // Settings-list row: full-width, left-aligned, generous vertical
        // padding for comfortable touch + readable two-line content
        // (title + subtitle). Used in /profile, /settings, etc.
        // Replaces the ad-hoc `h-auto w-full justify-start gap-3
        // rounded-none px-4 py-4 text-left` overrides.
        row: "h-auto w-full justify-start gap-3 rounded-none px-4 py-4 text-left text-meta",
        // Photo-upload tile (onboarding/photos): 3:4 portrait dashed slot.
        // Replaces per-instance `aspect-3/4 border-[1.5px] border-dashed
        // border-lavender bg-bg-elevated` overrides.
        // 2026-05-18: bg-bg-elevated → bg-(--card); hover bg-white/5 →
        // hover:bg-(--app). text-lavender stays — lavender has a light-mode
        // override and reads on both surfaces.
        dashedTile:
          "h-auto w-full aspect-3/4 p-0 rounded-2xl border-[1.5px] border-dashed border-lavender bg-(--card) text-lavender hover:bg-(--app) [&_svg:not([class*='size-'])]:size-6",
        // Circular dashed-lavender slot — story-row "Add" affordance.
        // Same dashed treatment as `dashedTile`, but a 56px round target
        // (matches StoryAvatar size="md") so the inbox row aligns visually
        // with the surrounding avatars. Replaces the inbox `flex h-auto
        // flex-col items-center gap-1 p-0 hover:bg-transparent` wrapper.
        dashedCircle:
          "size-tap-xl p-0 rounded-full border-[1.5px] border-dashed border-lavender bg-transparent text-lavender hover:bg-white/5 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    // Larger square tiles (xl, hero) use rounded-2xl rather than rounded-xl
    // — rounded-xl looks pinched at 48px+. tailwind-merge keeps the later
    // (compound) value when both rules apply to the same square.
    defaultVariants: {
      variant: "default",
      size: "default",
      tone: "none",
      lift: "none",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  tone = "none",
  lift = "none",
  nativeButton,
  render,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  // Base UI defaults `nativeButton` to true; when callers pass a non-button
  // `render` slot (commonly `<Link>` for nav buttons), Base UI warns. Default
  // `nativeButton` to `false` when render is provided so callers don't have
  // to thread it through every `<Button render={<Link/>}>` site.
  const resolvedNativeButton = nativeButton ?? (render == null)
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, tone, lift, className }))}
      nativeButton={resolvedNativeButton}
      render={render}
      {...props}
    />
  )
}

export { Button, buttonVariants }
