"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/app/theme-toggle";

type DesktopTopBarProps = {
  title: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * DesktopTopBar — 56px sticky header bar for desktop content area.
 *
 * Renders ONLY at md+ via `hidden md:flex`. Layout:
 *   [title]                              [actions] [theme toggle icon]
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
export function DesktopTopBar({ title, actions, className }: DesktopTopBarProps) {
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
