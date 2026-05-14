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
const pageShellVariants = cva("flex min-h-dvh flex-col", {
  variants: {
    bottomPad: {
      none:    "",
      default: "pb-6",
      nav:     "pb-20",
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
