"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

/**
 * EmptyState — Phase 6 Task 6.1 atom. 6 variants as specified by the master
 * plan + 1 generic ErrorState companion (next file).
 *
 * Composed entirely from shadcn `Empty` primitive + canonical Ahavah LogoMark
 * for brand-friendly empties. No raw className for the empty container,
 * scrim, or medium tile — all flows through `Empty*` slots.
 *
 * Variants → preset copy + media + accent color. Override any slot via the
 * matching prop (`title`, `description`, `media`, `action`).
 */

type Variant =
  | "no-matches"
  | "no-messages"
  | "no-search-results"
  | "filter-too-narrow"
  | "you-blocked-everyone"
  | "no-internet"
  | "profile-unavailable"
  | "no-views"
  | "no-views-sent";

type Preset = {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  // LogoMark accents (no-matches / no-messages) signal the brand-friendly
  // empties; lucide icons cover utility/info empties.
  useLogo?: boolean;
  iconColor?: string;
  /** Soft-tint tile behind the media (design-system empty pattern:
   *  icon in an 88px color-mix tile — see docs/design-audit
   *  2026-07-19 #2). Defaults to the lavender tint. */
  tileClass?: string;
};

const PRESETS: Record<Variant, Preset> = {
  "no-matches": {
    title: "No likes yet",
    description:
      "When someone likes you back, they'll appear here. Keep swiping to find your matches.",
    Icon: Heart,
    useLogo: true,
  },
  "no-messages": {
    title: "No conversations yet",
    description:
      "Start swiping to find matches. When you both like each other, you can chat here.",
    Icon: MessageCircle,
    useLogo: true,
  },
  "no-search-results": {
    title: "Nothing matches",
    description: "We couldn't find anything for that search. Try different words.",
    Icon: Search,
    iconColor: "text-(--ink-2)",
  },
  "filter-too-narrow": {
    title: "No one fits these filters",
    description:
      "Your filters are very specific. Try widening your distance or age range.",
    Icon: SlidersHorizontal,
    iconColor: "text-lavender",
  },
  "you-blocked-everyone": {
    title: "You've blocked everyone here",
    description:
      "Unblock people from Settings → Blocked users to see them in your matches again.",
    Icon: ShieldAlert,
    iconColor: "text-pink",
  },
  "no-internet": {
    title: "You're offline",
    description: "Check your connection. We'll try again automatically.",
    Icon: WifiOff,
    iconColor: "text-(--ink-2)",
    // Theme-aware neutral tint — plain white/8 disappears on the light
    // theme's cream surfaces.
    tileClass: "bg-(--ink)/8",
  },
  "profile-unavailable": {
    title: "This profile isn't available",
    description:
      "It might be private, or no longer active. Head back to discover to meet more people.",
    Icon: EyeOff,
    iconColor: "text-lavender",
  },
  // Who-viewed-you empties (SOT: "Ahavah Who Viewed You" export) — the
  // Viewed-you empty uses the OPEN eye ("no views yet" is neutral, not
  // "hidden"); the You-viewed empty uses the person glyph.
  "no-views": {
    title: "No views yet",
    description: "When someone views your profile, you will see them here.",
    Icon: Eye,
    iconColor: "text-lavender",
  },
  "no-views-sent": {
    title: "Nothing here yet",
    description:
      "Profiles you open will be listed here so you can find your way back.",
    Icon: UserRound,
    iconColor: "text-lavender",
  },
};

type EmptyStateProps = {
  variant: Variant;
  /** Override preset title. */
  title?: string;
  /** Override preset description. */
  description?: string;
  /** Optional CTA — if provided, renders a Button below the description.
      Navigation case: pass `href`. Action case: pass `onClick`. */
  action?: { label: string; onClick?: () => void; href?: string };
  /** Wrapper className override (gutter / margin tweaks per page). */
  className?: string;
};

export function EmptyState({
  variant,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const preset = PRESETS[variant];
  const { Icon, useLogo, iconColor, tileClass } = preset;

  // Design-system empty pattern (audit 2026-07-19 #2): media sits in an
  // 88px soft-tint circle; actions are lime pill CTAs, never outline.
  return (
    <Empty className={cn("mt-6", className)}>
      <EmptyHeader>
        <EmptyMedia>
          <span
            className={cn(
              "flex size-22 items-center justify-center rounded-full",
              tileClass ?? "bg-lavender/14",
            )}
          >
            {useLogo ? (
              <LogoMark size={44} decorative />
            ) : (
              <Icon className={cn("size-10", iconColor ?? "text-(--ink-2)")} />
            )}
          </span>
        </EmptyMedia>
        <EmptyTitle className="text-h2 text-(--ink)">
          {title ?? preset.title}
        </EmptyTitle>
        <EmptyDescription className="max-w-65 text-meta text-(--ink-2)">
          {description ?? preset.description}
        </EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent>
          {action.href ? (
            <Button
              nativeButton={false}
              tone="cta"
              size="tap"
              className="h-tap-lg rounded-full px-7 font-bold"
              render={<Link href={action.href} prefetch={false} />}
            >
              {action.label}
            </Button>
          ) : (
            <Button
              tone="cta"
              size="tap"
              className="h-tap-lg rounded-full px-7 font-bold"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/**
 * ErrorState — sister atom to EmptyState. Single shape: alert icon + title +
 * description + retry button. Used wherever a fetch / network / unexpected
 * failure needs to be surfaced inside a route's content area.
 *
 * Per Phase 6 R5 (every screen has loading/empty/error/happy) — this is the
 * "error" mock for any state-driven page.
 */

type ErrorStateProps = {
  title?: string;
  description?: string;
  retry?: { label?: string; onClick?: () => void };
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this. Check your connection and try again.",
  retry,
  className,
}: ErrorStateProps) {
  return (
    <Empty className={cn("mt-6", className)}>
      <EmptyHeader>
        <EmptyMedia>
          <span className="flex size-22 items-center justify-center rounded-full bg-pink/14">
            <AlertTriangle className="size-10 text-pink" />
          </span>
        </EmptyMedia>
        <EmptyTitle className="text-h2 text-(--ink)">{title}</EmptyTitle>
        <EmptyDescription className="max-w-65 text-meta text-(--ink-2)">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {retry ? (
        <EmptyContent>
          <Button
            tone="cta"
            size="tap"
            className="h-tap-lg rounded-full px-7 font-bold"
            onClick={retry.onClick}
          >
            {retry.label ?? "Try again"}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
