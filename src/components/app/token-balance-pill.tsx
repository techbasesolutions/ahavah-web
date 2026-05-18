"use client";

import Link from "next/link";
import { Coins } from "lucide-react";

import { Pill } from "@/components/kibo-ui/pill";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTokenBalance } from "@/lib/use-token-balance";

/**
 * TokenBalancePill — small lime Pill showing the user's current token
 * balance (spec §4.5; Phase 3 of monetization-tokens v1, 2026-05-16).
 *
 * Tap navigates to the token store at `/profile/tokens`.
 *
 * Returns `null` while the balance fetch is in-flight so the BottomNav row
 * doesn't reflow on first paint. The Pill ALSO renders for unauthenticated
 * users with `0` — the hook short-circuits in that branch so no 401 is
 * emitted — but BottomNav itself is only mounted on authenticated routes,
 * so this code path is defence-in-depth rather than user-visible.
 *
 * Placement note: spec §4.5 says "sidebar bottom row near the user-block".
 * This codebase doesn't have a sidebar — `ahavah-web` is mobile-first PWA
 * shell with a floating BottomNav. The Pill is rendered above the BottomNav
 * row (see bottom-nav.tsx). When/if a desktop sidebar lands, move the
 * Pill into the user-block region there.
 */
export function TokenBalancePill() {
  const { state, balance } = useTokenBalance();
  if (state === "loading") return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/profile/tokens"
              prefetch={false}
              aria-label={`${balance} tokens · tap to buy more`}
            />
          }
        >
          <Pill variant="lime" size="sm">
            <Coins className="size-3" aria-hidden />
            <span className="tabular-nums">{balance}</span>
          </Pill>
        </TooltipTrigger>
        <TooltipContent>Tokens · tap to buy more</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
