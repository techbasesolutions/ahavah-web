"use client";

import Link from "next/link";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/kibo-ui/pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * TokenSpendSheet — reusable token-spend confirmation modal. Rebuilt
 * 2026-05-17 to use kit primitives only (Dialog + Card + Pill + Button)
 * and to render correctly on BOTH viewports:
 *
 * - Mobile (<md): bottom-anchored sheet — slides up from the bottom of
 *   the viewport, full-width, rounded top corners only.
 * - Desktop (md+): centered modal — fixed in the viewport centre,
 *   capped width, fully rounded.
 *
 * Single primitive (Dialog) styled via responsive Tailwind prefixes —
 * one mount, no double focus traps, no JS branching. Theme-aware via
 * --app / --card / --ink / --hairline aliases (so both light and dark
 * themes paint correctly).
 *
 * `currentBalance` accepts `number | null`. `null` means the balance is
 * still loading — the modal renders the confirm CTA optimistically rather
 * than flashing "Get tokens" against a stale 0. The backend 402s if the
 * user genuinely doesn't have enough, and the caller's catch path keeps
 * the modal open in that case.
 *
 * If `currentBalance` is a known number `< cost`, the confirm Button is
 * replaced with a "Get tokens" Link to /profile/tokens.
 *
 * Component name retained as `TokenSpendSheet` for caller compatibility;
 * the surface is no longer a Sheet primitive.
 */
export type SpendState = "loading" | "sufficient" | "insufficient";

export function computeSpendState(
  currentBalance: number | null,
  cost: number,
): SpendState {
  if (currentBalance == null) return "loading";
  return currentBalance < cost ? "insufficient" : "sufficient";
}

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  cost: number;
  currentBalance: number | null;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
};

export function TokenSpendSheet({
  open,
  onOpenChange,
  title,
  description,
  cost,
  currentBalance,
  onConfirm,
  busy,
}: Props) {
  const insufficient = computeSpendState(currentBalance, cost) === "insufficient";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Responsive presentation: bottom sheet on mobile / centered modal
        // on desktop. Overrides shadcn DialogContent's default centred
        // transform on small screens, restores it (and caps width) at md+.
        // `[&>button[type=button]]` targets the default Close (X) button —
        // ensure it inherits ink color in both themes.
        className={cn(
          // Mobile (<md) — bottom-anchored sheet pattern
          "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0",
          "max-md:w-full max-md:max-w-none max-md:rounded-t-3xl max-md:rounded-b-none",
          "max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=open]:zoom-in-100",
          "max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=closed]:zoom-out-100",
          // Desktop (md+) — centered modal, capped width
          "md:max-w-md md:rounded-3xl",
          // Common — theme-aware surfaces
          "bg-(--app) text-(--ink) border-(--hairline) p-6 gap-3",
          // Close button (the default ✕ shadcn renders) — paint with ink
          "[&>button[type=button]_svg]:text-(--ink)",
        )}
      >
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-(--ink) text-h2 font-extrabold">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-(--ink-2) text-meta">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {/* Cost row — Card primitive (not a hand-rolled bg-* div). */}
        <Card
          tone="elevated"
          className="mt-2 flex flex-row items-center justify-between p-4 rounded-2xl gap-0"
        >
          <span className="text-meta font-medium text-(--ink)">Cost</span>
          <Pill variant="lime" size="default">
            <Coins className="size-3.5" aria-hidden />
            <span className="tabular-nums font-bold">{cost}</span>
            <span className="font-medium">
              {cost === 1 ? "token" : "tokens"}
            </span>
          </Pill>
        </Card>

        {/* Balance line — Pill primitive (not a hand-rolled inline icon+number). */}
        <p className="flex items-center gap-2 text-caption text-(--ink-2)">
          <span>Your balance:</span>
          <Pill variant="lime" size="sm">
            <Coins className="size-3" aria-hidden />
            <span className="tabular-nums">
              {currentBalance == null ? "—" : currentBalance}
            </span>
          </Pill>
          {insufficient ? (
            <span className="text-(--color-pink)">not enough</span>
          ) : null}
        </p>

        {/* Footer actions — Button primitives, no raw <button>. */}
        <div className="mt-3 flex flex-col gap-2">
          {insufficient ? (
            <Button
              size="cta"
              tone="cta"
              render={<Link href="/profile/tokens" prefetch={false} />}
              onClick={() => onOpenChange(false)}
            >
              Get tokens
            </Button>
          ) : (
            <Button
              size="cta"
              tone="cta"
              lift="float"
              onClick={() => void onConfirm()}
              disabled={busy}
            >
              {busy
                ? "Working…"
                : `Confirm · ${cost} ${cost === 1 ? "token" : "tokens"}`}
            </Button>
          )}
          <Button
            variant="link"
            size="tap"
            className="self-center text-(--ink-2)"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
