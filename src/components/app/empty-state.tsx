"use client";

import * as React from "react";
import {
  AlertTriangle,
  Heart,
  MessageCircle,
  Search,
  ShieldAlert,
  SlidersHorizontal,
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

import { SparkleMark } from "@/components/brand/sparkle-mark";
import { cn } from "@/lib/utils";

/**
 * EmptyState — Phase 6 Task 6.1 atom. 6 variants as specified by the master
 * plan + 1 generic ErrorState companion (next file).
 *
 * Composed entirely from shadcn `Empty` primitive + brand sparkle mark
 * (Phase D documented exception). No raw className for the empty container,
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
  | "no-internet";

type Preset = {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  // Sparkle accents (no-matches / no-messages) signal the brand-friendly
  // empties; lucide icons cover utility/info empties.
  useSparkle?: boolean;
  sparkleColor?: string;
  iconColor?: string;
};

const PRESETS: Record<Variant, Preset> = {
  "no-matches": {
    title: "No likes yet",
    description:
      "When someone likes you back, they'll appear here. Keep swiping to find your matches.",
    Icon: Heart,
    useSparkle: true,
    sparkleColor: "#FF4566",
  },
  "no-messages": {
    title: "No conversations yet",
    description:
      "Start swiping to find matches. When you both like each other, you can chat here.",
    Icon: MessageCircle,
    useSparkle: true,
    sparkleColor: "#D7FF81",
  },
  "no-search-results": {
    title: "Nothing matches",
    description: "We couldn't find anything for that search. Try different words.",
    Icon: Search,
    iconColor: "text-text-secondary",
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
    iconColor: "text-text-secondary",
  },
};

type EmptyStateProps = {
  variant: Variant;
  /** Override preset title. */
  title?: string;
  /** Override preset description. */
  description?: string;
  /** Optional CTA — if provided, renders a Button below the description. */
  action?: { label: string; onClick?: () => void };
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
  const { Icon, useSparkle, sparkleColor, iconColor } = preset;

  return (
    <Empty className={cn("mx-5 mt-6", className)}>
      <EmptyHeader>
        <EmptyMedia>
          {useSparkle ? (
            <SparkleMark size={56} color={sparkleColor ?? "#D7FF81"} />
          ) : (
            <Icon className={cn("size-14", iconColor ?? "text-text-secondary")} />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-h3 text-white">
          {title ?? preset.title}
        </EmptyTitle>
        <EmptyDescription className="text-meta text-text-secondary">
          {description ?? preset.description}
        </EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent>
          <Button variant="outlineSubtle" size="lg" onClick={action.onClick}>
            {action.label}
          </Button>
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
    <Empty className={cn("mx-5 mt-6", className)}>
      <EmptyHeader>
        <EmptyMedia>
          <AlertTriangle className="size-14 text-pink" />
        </EmptyMedia>
        <EmptyTitle className="text-h3 text-white">{title}</EmptyTitle>
        <EmptyDescription className="text-meta text-text-secondary">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {retry ? (
        <EmptyContent>
          <Button variant="outlineSubtle" size="lg" onClick={retry.onClick}>
            {retry.label ?? "Try again"}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
