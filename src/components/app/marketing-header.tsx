"use client";

// Marketing-surface header used by every public route (/ landing, /help,
// future /press, /careers, etc.). Sticky glass-blur with Ahavah lockup +
// theme toggle + a contextual CTA slot. Replaces the bare-div headers
// hand-rolled in / and /help so the chrome lives in ONE place and changes
// to spacing/blur/height propagate everywhere.
//
// Pixel-precise marketing rhythm (h-16, max-w-[1200px]) deliberately
// matches the design handoff at Landing Page/Ahavah-handoff/.../Ahavah
// Landing.html. Same eslint-disable rationale as src/app/page.tsx and
// src/app/help/page.tsx.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { cn } from "@/lib/utils";

type MarketingHeaderProps = {
  /**
   * Optional primary-nav slot rendered between the brand lockup and the
   * right cluster. Hidden on mobile (md:flex). Pass a `<nav>` or fragment
   * of anchor/Link children. /help leaves this empty; / fills it with
   * "How it works / Features / Verified / FAQ".
   */
  primaryNav?: ReactNode;
  /**
   * Right-cluster CTA slot. ThemeToggle always renders BEFORE this. Pass
   * a `<Button>` (or a session-aware sub-component) here.
   */
  cta?: ReactNode;
  /**
   * Optional className appended to the outer <header>. For per-page
   * z-index or top-offset tweaks ONLY; do not override colour/spacing
   * tokens.
   */
  className?: string;
};

export function MarketingHeader({ primaryNav, cta, className }: MarketingHeaderProps) {
  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-50 border-b border-(--hairline)",
        "bg-(--app)/80 backdrop-blur-xl backdrop-saturate-150",
        className,
      )}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" aria-label="Ahavah home" className="shrink-0">
          <Logo variant="horizontal" height={32} priority />
        </Link>

        {primaryNav ? (
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm text-(--ink-2)"
          >
            {primaryNav}
          </nav>
        ) : null}

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle variant="icon" />
          {cta}
        </div>
      </div>
    </header>
  );
}
