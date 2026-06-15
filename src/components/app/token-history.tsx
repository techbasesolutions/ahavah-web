"use client";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useTokenHistory,
  type TokenHistoryItem,
} from "@/lib/use-token-history";

/**
 * Token transaction history — the real ledger surface for the tokens
 * page (replaces the old PLACEHOLDER_HISTORY). One component, two
 * placements:
 *
 *   variant="mobile"  — content-height card in the mobile single column.
 *                        Page scrolls; no inner scroll.
 *   variant="desktop" — fills the `flex-1 min-h-0` rail Card; rows live
 *                        in an inner overflow-y-auto region.
 *
 * Identity-blind by contract: reason -> label below NEVER renders a raw
 * enum and NEVER surfaces a recipient name. Credit/debit sign is derived
 * from `delta`, never from `reason`.
 */

type Variant = "mobile" | "desktop";

/**
 * Reason -> human label. Identity-blind. The credit/debit SIGN is taken
 * from `delta` at render time, NOT inferred here. Unknown reasons fall
 * back to "Adjustment" so a new backend enum never leaks raw.
 */
function labelForRow(item: TokenHistoryItem): string {
  switch (item.reason) {
    case "purchase":
      return `Bought ${item.delta} tokens`;
    case "subscription_stipend":
      return "Premium tokens";
    case "referral":
      return "Referral reward";
    case "refund":
    case "admin_credit":
    case "admin_debit":
      return "Adjustment";
    case "boost":
      return "Boost";
    case "super_like":
      return "Super Like";
    case "rewind":
      return "Rewind";
    case "reveal_liker":
      return "Revealed a liker";
    case "day_pass":
      return "Day pass";
    default:
      return "Adjustment";
  }
}

const MS_DAY = 86_400_000;

/**
 * Tiny local relative-time helper (the ONE sanctioned non-primitive
 * helper). Produces no visual atom — just a string for the date line.
 * Today / Yesterday / {n} days ago / {n} weeks ago, then an absolute
 * "MMM d, yyyy" beyond ~4 weeks.
 */
function formatRelative(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  ).getTime();

  const dayDiff = Math.round((startOfToday - startOfThen) / MS_DAY);

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return `${dayDiff} days ago`;
  if (dayDiff < 28) {
    const weeks = Math.floor(dayDiff / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function HistoryRow({
  item,
  isLast,
}: {
  item: TokenHistoryItem;
  isLast: boolean;
}) {
  const isCredit = item.delta > 0;
  const label = labelForRow(item);
  const relative = formatRelative(item.date);
  const secondLine =
    item.amountLabel && item.reason === "purchase"
      ? `${relative} · ${item.amountLabel}`
      : relative;

  // SR restatement of the chip value using words, since the chip itself
  // is aria-hidden. "plus 10 tokens" / "minus 1 token".
  const magnitude = Math.abs(item.delta);
  const srValue = `${isCredit ? "plus" : "minus"} ${magnitude} ${
    magnitude === 1 ? "token" : "tokens"
  }`;

  return (
    <li
      className={
        isLast
          ? "flex items-center gap-3 py-2.5"
          : "flex items-center gap-3 py-2.5 border-b border-(--hairline)"
      }
    >
      <span
        aria-hidden
        className={
          isCredit
            ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-lime/20 text-(--color-success) text-sm font-extrabold tabular-nums"
            : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-lavender/20 text-lavender text-sm font-extrabold tabular-nums"
        }
      >
        {isCredit ? `+${item.delta}` : item.delta}
      </span>
      <div className="flex-1 min-w-0">
        <span className="sr-only">{`${label}, ${srValue}, ${secondLine}`}</span>
        <p aria-hidden className="text-meta text-(--ink) m-0 truncate">
          {label}
        </p>
        <p aria-hidden className="text-caption text-(--ink-3) m-0">
          {secondLine}
        </p>
      </div>
    </li>
  );
}

function HistorySkeleton() {
  return (
    <ul className="flex flex-col" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function HistoryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-xl bg-lavender/20 text-lavender"
      >
        <FileText className="size-4.5" />
      </span>
      <p className="text-meta font-semibold text-(--ink) m-0">No activity yet</p>
      <p className="text-caption text-(--ink-3) m-0">
        Your token purchases and spends will show up here.
      </p>
    </div>
  );
}

export function TokenHistory({ variant }: { variant: Variant }) {
  const { items, loading, error, hasMore, loadMore, reload } =
    useTokenHistory();

  const isDesktop = variant === "desktop";
  // First load (no rows yet) shows the skeleton; a load-more in flight
  // keeps the existing rows and only swaps the trailing button to busy.
  const firstLoad = loading && items.length === 0;

  return (
    <Card tone="default" className={isDesktop ? "flex-1 min-h-0" : undefined}>
      <CardContent
        className={
          isDesktop
            ? "flex flex-col gap-3.5 p-5 h-full"
            : "flex flex-col gap-3.5 p-5"
        }
      >
        <div className="flex items-center justify-between">
          <p
            className="text-overline text-(--ink-2) m-0"
            role="heading"
            aria-level={2}
          >
            History
          </p>
          <FileText className="size-3.5 text-(--ink-3)" aria-hidden />
        </div>

        <div
          className={
            isDesktop
              ? "flex flex-col overflow-y-auto min-h-0"
              : "flex flex-col"
          }
        >
          {firstLoad ? (
            <HistorySkeleton />
          ) : error && items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-4">
              <p
                role="alert"
                aria-live="polite"
                className="text-meta text-pink m-0"
              >
                Couldn&apos;t load your history. Try again.
              </p>
              <Button
                variant="outlineSubtle"
                size="sm"
                onClick={() => void reload()}
              >
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <HistoryEmpty />
          ) : (
            <>
              <ul className="flex flex-col">
                {items.map((item, i) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    isLast={i === items.length - 1}
                  />
                ))}
              </ul>
              {hasMore ? (
                <Button
                  variant="outlineSubtle"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => void loadMore()}
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Load more"}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
