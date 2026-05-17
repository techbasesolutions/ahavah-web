"use client";

import { Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * TokenSpendSheet — reusable bottom-Sheet confirmation for any token
 * spend (reveal, super-like, day-pass, boost). Caller controls open
 * state + provides the action title, cost, current balance, and the
 * confirm handler.
 *
 * If `currentBalance < cost`, the confirm Button is replaced with a
 * "Get tokens" Link to /profile/tokens.
 *
 * Plan deviation: the plan referenced `Card tone="profile-section"` in
 * sibling spec blocks — that variant does not exist on master. This
 * primitive uses only Sheet + Button + token classnames, no Card.
 */
export function TokenSpendSheet({
  open,
  onOpenChange,
  title,
  description,
  cost,
  currentBalance,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  cost: number;
  currentBalance: number;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}) {
  const insufficient = currentBalance < cost;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-white/10 bg-bg-indigo"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-text-secondary">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-bg-elevated px-4 py-3">
          <span className="text-meta text-white">Cost</span>
          <span className="flex items-center gap-1 text-meta font-semibold text-lime tabular-nums">
            <Circle className="size-3 fill-current" aria-hidden />
            {cost} {cost === 1 ? "token" : "tokens"}
          </span>
        </div>
        <p className="mt-2 text-caption text-text-muted">
          Your balance: <span className="tabular-nums">{currentBalance}</span>
          {insufficient ? " — not enough to confirm" : ""}
        </p>

        <SheetFooter className="mt-4 flex-col gap-2">
          {insufficient ? (
            <Button
              size="cta"
              variant="default"
              onClick={() => {
                onOpenChange(false);
                window.location.assign("/profile/tokens");
              }}
            >
              Get tokens
            </Button>
          ) : (
            <Button
              size="cta"
              lift="float"
              onClick={() => void onConfirm()}
              disabled={busy}
            >
              {busy ? "Working…" : `Confirm · ${cost} ${cost === 1 ? "token" : "tokens"}`}
            </Button>
          )}
          <Button
            variant="link"
            size="tap"
            className="self-center text-text-muted"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
