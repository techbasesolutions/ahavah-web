import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * PageShell — the outer column layout used by every top-level route.
 *
 * `bottomPad` reserves room for the BottomNav (`pb-24`) when the page
 * uses one, defaults to a smaller `pb-6` otherwise. Encapsulates the
 * `flex h-full flex-col pb-{N}` boilerplate so consumers don't write it.
 */
// `nav` clears the fixed BottomNav (bottom-3 + h-tap-xl 56px = 68px from
// viewport bottom) plus a small gap. Was previously pb-24 (96px) — too
// generous, leaving a visible gap of bg-indigo between content and nav.
//
// `min-h-dvh` (NOT `min-h-screen` / `h-full` / `min-h-full`):
//   - `h-full`     was clamping content to exactly 100% of parent — broke
//                  scroll when content overflowed.
//   - `min-h-full` allowed growing but `flex-1` children got ZERO height
//                  because the parent's height was content-driven (no
//                  reference height to share) — broke /discover where the
//                  swipe deck depends on flex-1 to fill the viewport.
//   - `min-h-screen` (= 100vh) is the LARGE-viewport unit on mobile —
//                  computed as if the URL bar is hidden. On first paint
//                  with the address bar shown, the page renders taller
//                  than the visible area, the /discover card overflows
//                  the viewport, and its `absolute bottom-4` action row
//                  ends up off-screen behind the BottomNav. Surfaced
//                  by user 2026-05-14: "the card still loads like this"
//                  with screenshots showing buttons clipped on first
//                  render, then correct after any interaction.
//   - `min-h-dvh`  uses the DYNAMIC viewport height — recomputes as
//                  browser chrome shows/hides, so the layout always
//                  matches the actually-visible area. Safari/Chrome
//                  mobile have supported it since 2022.
// `nav-fixed` (added 2026-05-14): a stricter variant of `nav` for
// single-screen surfaces that must not scroll AND must clear the
// home-indicator safe area on iOS PWAs. Used by /discover where the
// card's flex-1 fill could otherwise push the absolute-positioned
// action row past the visible viewport on first paint, clipping the
// Skip / Pause / Like buttons behind the BottomNav. h-dvh + max-h-dvh
// pin the shell to the visible viewport (not just a min-bound), and
// overflow-hidden swallows any sub-pixel overshoot. The pb math adds
// env(safe-area-inset-bottom) on top of the 80px nav clearance — on
// devices without a home indicator that env() resolves to 0, so it's
// safe to apply universally.
const pageShellVariants = cva("flex flex-col", {
  variants: {
    bottomPad: {
      none:    "min-h-dvh",
      default: "min-h-dvh pb-6",
      nav:     "min-h-dvh pb-20",
      "nav-fixed":
        "h-dvh max-h-dvh overflow-hidden pb-[calc(--spacing(20)+env(safe-area-inset-bottom))]",
    },
  },
  defaultVariants: { bottomPad: "default" },
});

export function PageShell({
  children,
  bottomPad,
  className,
  ...props
}: VariantProps<typeof pageShellVariants> &
  React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-shell"
      className={cn(pageShellVariants({ bottomPad }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * PageHeader — the title + optional subtitle area at the top of a route.
 * Consistent gutters (px-5) + top spacing (pt-6); pb is omitted when the
 * subtitle is the last thing in the header (caller adds spacing in the
 * next section).
 */
const pageHeaderVariants = cva("px-5 pt-6", {
  variants: {
    pad: {
      tight: "pb-3",  // search/section follows immediately
      default: "",    // next section provides its own top padding
    },
  },
  defaultVariants: { pad: "default" },
});

export function PageHeader({
  children,
  pad,
  className,
}: VariantProps<typeof pageHeaderVariants> & {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      data-slot="page-header"
      className={cn(pageHeaderVariants({ pad }), className)}
    >
      {children}
    </header>
  );
}

export function PageHeaderTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 data-slot="page-header-title" className="text-display text-white">
      {children}
    </h1>
  );
}

export function PageHeaderSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-slot="page-header-subtitle"
      className="mt-2 text-meta text-text-secondary"
    >
      {children}
    </p>
  );
}

/**
 * PageSection — non-header full-width section with consistent gutters.
 * Use for input rows, content blocks, etc. that need the same px-5 as the
 * header but no top padding (caller adds it).
 */
export function PageSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section data-slot="page-section" className={cn("px-5", className)}>
      {children}
    </section>
  );
}
