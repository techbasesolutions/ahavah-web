"use client";

import Link from "next/link";
import { ChevronRight, Coins } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

/**
 * InviteTokensRow — /profile/tokens entry point 2 into /invite (SOT:
 * "Ahavah Invite" export, "Entry point 2 · Tokens sheet" board — "Secondary
 * row, below the token balance"). Quiet lavender icon tile, distinct from
 * InviteCard's lime promo treatment on /profile.
 *
 * `--link-accent` already encodes exactly the export's per-theme swap for
 * this tile (lavender on dark, indigo on light — see the export's
 * `.ibadge.quiet` light override) — reused as-is rather than adding a new
 * token.
 */
export function InviteTokensRow() {
  return (
    <Card tone="default" size="sm">
      <CardContent className="px-0">
        <Item
          variant="muted"
          render={<Link href="/invite" prefetch={false} className="rounded-2xl" />}
        >
          <ItemMedia>
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--link-accent)/15 text-(--link-accent)"
            >
              <Coins className="size-4.5" />
            </span>
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-meta text-(--ink)">
              Earn 5 tokens per friend
            </ItemTitle>
            <ItemDescription className="text-caption text-(--ink-3)">
              Invite a friend to Ahavah
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <ChevronRight className="size-4 text-(--ink-3)" />
          </ItemActions>
        </Item>
      </CardContent>
    </Card>
  );
}
