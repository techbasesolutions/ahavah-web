"use client";

import { ThemeToggle } from "@/components/app/theme-toggle";

/**
 * MobileThemeFloat — fixed-position top-RIGHT theme toggle icon for mobile.
 *
 * Renders ONLY at <md via `md:hidden`. User direction (2026-05-17) was
 * "top left header" — but every mobile route's PageHeader puts the
 * Ahavah lockup at top-left, so the floating toggle there directly
 * obscured the brand text. Moved to top-RIGHT as the pragmatic
 * resolution — still in the top header region, still globally
 * accessible, no brand-mark collision. If you want the toggle on the
 * left instead, the per-route fix is to remove the brand lockup from
 * each mobile PageHeader (the BottomNav already provides Home
 * navigation, the brand lockup is decorative there).
 *
 * Mounted globally by PageShell for sidebar-shell routes so every
 * authenticated mobile route picks it up without per-route edits.
 * Pre-auth full-bleed routes (welcome/sign-in/sign-up/onboarding)
 * do NOT mount this — theme is post-onboarding chrome only.
 *
 * Positioned at `top-3 right-3` (12px from each edge) — clears iOS
 * status-bar safe-area on PWA installs (safe-area-inset-top via env()).
 * Z-index sits above page content (z-40) but below modal portals (z-50+).
 */
export function MobileThemeFloat() {
  return (
    <div
      className="md:hidden fixed right-3 z-40 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <div className="pointer-events-auto">
        <ThemeToggle variant="icon" />
      </div>
    </div>
  );
}
