import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { DesktopSidebar } from "@/components/app/desktop-sidebar";
import { DesktopTopBar } from "@/components/app/desktop-topbar";

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
      // `nav-fixed` is a mobile-only constraint (pin to viewport + hide
      // overflow so the absolute action row never clips behind BottomNav).
      // On desktop (md+) there is no BottomNav and the page must scroll
      // freely, so we release the height pin at md and let content grow.
      "nav-fixed":
        "h-dvh max-h-dvh overflow-hidden pb-[calc(--spacing(20)+env(safe-area-inset-bottom))] md:h-auto md:max-h-none md:overflow-visible md:min-h-dvh md:pb-0",
    },
  },
  defaultVariants: { bottomPad: "default" },
});

/**
 * desktopShell controls how the route renders at ≥md:
 *
 * - "sidebar"     (default) — wraps children in DesktopShell (sidebar +
 *                 content area) at md+; mobile shell renders at <md only.
 * - "full-bleed"  — no DesktopShell wrapper; children fill the viewport
 *                 directly at all sizes. Use for: welcome / auth /
 *                 onboarding / match / paywall / locked.
 * - "mobile-only" — legacy: only the mobile column ever renders; the
 *                 desktop slot is omitted. Use for routes not yet
 *                 desktop-ified.
 *
 * Visibility is handled with Tailwind responsive prefixes — NO JS
 * branching (no useMediaQuery). The mobile <div> carries `md:hidden`
 * and the DesktopShell carries `hidden md:grid`.
 */
export function PageShell({
  children,
  bottomPad,
  className,
  desktopShell = "sidebar",
  topBarTitle,
  topBarActions,
  ...props
}: VariantProps<typeof pageShellVariants> &
  React.ComponentProps<"div"> & {
    desktopShell?: "sidebar" | "full-bleed" | "mobile-only";
    /** Title string for the desktop top bar (only used when desktopShell="sidebar"). */
    topBarTitle?: string;
    /** Actions slot for the desktop top bar (only used when desktopShell="sidebar"). */
    topBarActions?: React.ReactNode;
  }) {
  if (desktopShell === "sidebar") {
    const topBar = topBarTitle ? (
      <DesktopTopBar title={topBarTitle} actions={topBarActions} />
    ) : undefined;

    return (
      <div className="md:flex md:min-h-dvh md:bg-(--canvas,#ECE9E0)">
        {/* MobileThemeFloat removed 2026-05-17 per user direction — the
            floating top-corner toggle was visually disruptive on mobile.
            Theme switching on mobile is now accessed via /settings →
            Theme row. Desktop keeps the icon in DesktopTopBar. */}

        {/* Sidebar: chrome only — hidden md:flex inside the component itself */}
        <DesktopSidebar />

        {/* Main column */}
        <div className="md:flex md:flex-1 md:flex-col md:min-w-0">
          {topBar /* DesktopTopBar is hidden md:flex internally */}
          <div
            data-slot="page-shell"
            className={cn(
              pageShellVariants({ bottomPad }),
              // Desktop loses the mobile bottom-nav clearance and gets 32px page padding instead
              "md:p-8 md:pb-8 md:min-h-0",
              className,
            )}
            {...props}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  // full-bleed + mobile-only: render only the single mobile-style column.
  // Note: pre-auth routes (welcome/sign-in/sign-up/onboarding) use this
  // branch and DO NOT get the floating mobile theme toggle — theme is
  // selectable post-onboarding via the global controls.
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
  // Theme-aware: --ink resolves to white in dark theme, near-black in
  // light theme. `text-white` hardcoded was a dark-mode-only choice that
  // rendered invisible white-on-cream in light theme (2026-05-17 fix).
  return (
    <h1
      data-slot="page-header-title"
      className="text-display text-(--ink)"
    >
      {children}
    </h1>
  );
}

export function PageHeaderSubtitle({ children }: { children: React.ReactNode }) {
  // Theme-aware: --ink-2 = B5B0CC dark / oklch(0.45...) light.
  return (
    <p
      data-slot="page-header-subtitle"
      className="mt-2 text-meta text-(--ink-2)"
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
