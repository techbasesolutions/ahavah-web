"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { BackButton } from "@/components/app/back-button";
import { ThemeToggle } from "@/components/app/theme-toggle";

type DesktopTopBarProps = {
  title: string;
  actions?: React.ReactNode;
  /**
   * Back button config (user direction 2026-05-19: every page needs a way
   * to navigate away on desktop).
   *
   * - `string` (fallback URL) — show back button; uses `router.back()` with
   *   this URL as fallback when history is empty (cold-start / direct link).
   * - `false` — explicitly hide. Pass this on tab-root pages where the
   *   sidebar IS the navigation (Discover / Matches / Inbox / Profile /
   *   Settings root / Map).
   * - omitted — defaults to `/discover` fallback. Every sidebar page gets
   *   a back button unless it opts out.
   */
  back?: string | false;
  className?: string;
};

/**
 * DesktopTopBar — 56px sticky header bar for desktop content area.
 *
 * Renders ONLY at md+ via `hidden md:flex`. Layout:
 *   [back] [title]                       [actions] [theme toggle icon]
 *
 * The theme toggle sits at the FAR RIGHT of the header per user direction
 * (2026-05-17 update from earlier left-placement) — "on desktop put it in
 * the top RIGHT." Mounted globally for every md+ sidebar route. After
 * route-specific `actions`, so the toggle is always the right-most chrome
 * element regardless of which route renders.
 *
 * Consumes light-mode CSS vars (--nav-bg, --nav-border, --ink) set by
 * Wave 1's ThemeProvider.
 */
export function DesktopTopBar({
  title,
  actions,
  back = "/discover",
  className,
}: DesktopTopBarProps) {
  const showBack = back !== false;
  const fallback = typeof back === "string" ? back : "/discover";

  return (
    <header
      className={cn(
        "hidden md:flex h-14 shrink-0 sticky top-0 z-10 items-center gap-4 border-b px-6",
        className,
      )}
      style={{
        background: "var(--nav-bg)",
        borderColor: "var(--nav-border)",
      }}
    >
      {showBack ? (
        <BackButton
          fallback={fallback}
          label={`Back to ${fallback.replace(/^\//, "") || "home"}`}
          className="size-9 shrink-0"
        />
      ) : null}
      <h1
        className="flex-1 text-h1 font-extrabold tracking-tight truncate"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h1>
      {actions ? (
        <div className="flex items-center gap-3">{actions}</div>
      ) : null}
      {/* Top-RIGHT: theme toggle icon. Global header chrome, placed AFTER
          route-specific actions so it's always the right-most control. */}
      <ThemeToggle variant="icon" />
    </header>
  );
}
