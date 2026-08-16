"use client";

import Link from "next/link";
import { ChevronRight, Gift } from "lucide-react";

/**
 * InviteCard — /profile entry point 1 into /invite (SOT: "Ahavah Invite"
 * export, "Entry point 1 · Profile screen" board). Lime-tinted promo row,
 * same visual family as the app's other lime-accent chips/pills — placed
 * directly below BoostCard on both mobile and desktop per the export's
 * placement note ("full-width card row, lime accent").
 *
 * `bg-lime/13` + `border-lime/34` approximate the export's
 * `color-mix(in oklch, var(--lime) 13%/34%, transparent)` — Tailwind v4
 * doesn't expose color-mix as a static utility, so the /NN alpha-tint
 * shorthand is the closest token-driven equivalent and resolves against
 * the same theme-aware `--color-lime` used everywhere else lime appears.
 */
export function InviteCard() {
  return (
    <Link
      href="/invite"
      prefetch={false}
      className="flex items-center gap-3.5 rounded-[20px] border border-lime/34 bg-lime/13 p-4 transition-colors hover:bg-lime/16"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-lime/16 text-(--text-success)"
      >
        <Gift className="size-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-meta font-bold text-(--ink) m-0">
          Invite friends, earn Premium
        </p>
        <p className="text-caption text-(--ink-3) m-0">
          30 days and 5 tokens per friend
        </p>
      </div>
      <ChevronRight aria-hidden className="size-4.5 text-(--ink-2) shrink-0" />
    </Link>
  );
}
