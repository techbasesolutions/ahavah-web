"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient, ApiError, getSessionToken } from "@/lib/api-client";
import type { ReferralItem, ReferralsMeResponse } from "@/lib/api-types";

/**
 * useReferrals — fetch hook for /invite (GET /referrals/me). Mirrors
 * useDiscoverDeck's conventions (isLoading / error / data, no swr, no
 * caching layer) rather than useTokenBalance's discriminated-union
 * shape, per the /invite build brief.
 *
 * On error, the LAST successful response is preserved (same "don't blank
 * the UI on a failed revalidation" rule useDiscoverDeck uses for
 * `items`) — this is what lets /invite show a working link alongside the
 * SOT's "status list failed" error box on a background refetch failure.
 * A true first-load failure has no cached response to fall back to; the
 * page component branches on `data === null` to tell that case apart
 * from a stale-but-good revalidation failure.
 */
export type UseReferralsResult = {
  data: ReferralsMeResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  reload: () => Promise<void>;
};

export function useReferrals(): UseReferralsResult {
  const [data, setData] = useState<ReferralsMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    if (!getSessionToken()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiClient.get<ReferralsMeResponse>("/referrals/me");
      setData(res);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e
          : new ApiError(0, null, e instanceof Error ? e.message : "Network error"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { data, isLoading, error, reload: load };
}

/**
 * Row display name. `display_name` is null until the referred friend
 * sets one — the design export never falls back to an email or any
 * other identifying value, just the literal string "A friend".
 */
export function friendDisplayName(item: Pick<ReferralItem, "display_name">): string {
  return item.display_name && item.display_name.trim().length > 0
    ? item.display_name
    : "A friend";
}

/** Single-letter avatar-tile initial for a resolved display name. */
export function friendInitial(name: string): string {
  return (name.trim()[0] ?? "A").toUpperCase();
}

/** "4 Aug" / "28 Jul" — day + short month, no year (matches the SOT's
 *  invite-row date style exactly). Falls back to the raw ISO string's
 *  date portion if it can't be parsed. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Splits a referral link into a display prefix + the bolded code, e.g.
 * "https://ahavah.app/i/242W67K" -> { prefix: "ahavah.app/i/", code:
 * "242W67K" }. Falls back to a synthesized "ahavah.app/i/<code>" shape
 * if `link` isn't a well-formed URL (defensive — the backend contract
 * guarantees a URL, but this keeps the field renderable either way).
 */
export function formatInviteLink(
  link: string,
  code: string,
): { prefix: string; code: string } {
  try {
    const url = new URL(link);
    const path = url.pathname.endsWith(code)
      ? url.pathname.slice(0, url.pathname.length - code.length)
      : url.pathname;
    return { prefix: `${url.host}${path}`, code };
  } catch {
    return { prefix: "ahavah.app/i/", code };
  }
}

/** Tally strip's "Premium months" cell — derived from premium_days_earned
 *  (the backend has no dedicated months field). Rounds to the nearest
 *  whole month; 30-day credits land on exact integers in practice. */
export function premiumMonthsEarned(premiumDaysEarned: number): number {
  return Math.round(premiumDaysEarned / 30);
}
