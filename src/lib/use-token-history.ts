"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient, getSessionToken } from "@/lib/api-client";

/**
 * One ledger row as returned by GET /tokens/history (auth; @aget).
 * The API ships the RAW `reason` enum + signed `delta`; the frontend
 * (token-history.tsx) maps reason -> label and derives credit/debit
 * from the SIGN of `delta`, never from the reason string.
 *
 * `amountLabel` is present only on purchase rows (e.g. "$4.99") and is
 * rendered verbatim — the frontend never formats currency.
 */
export type TokenHistoryItem = {
  id: string;
  /** ISO-8601 timestamp. */
  date: string;
  /** Raw backend enum (purchase, boost, super_like, …). */
  reason: string;
  /** Signed: positive = credit, negative = debit. */
  delta: number;
  /** Purchase rows only, e.g. "$4.99". Rendered verbatim. */
  amountLabel?: string;
};

type TokenHistoryResponse = {
  items: ReadonlyArray<TokenHistoryItem>;
  /** String offset for the next page; null = no more rows. */
  nextCursor: string | null;
};

const PAGE_SIZE = 20;

/**
 * Hook that fetches the current user's token transaction history from
 * GET /tokens/history?limit=20&offset=0 (monetization-tokens, history
 * surface). Mirrors the shape + safe-on-unauth behavior of
 * `use-token-balance.ts`.
 *
 * Pagination is offset-based: `nextCursor` from the response is a string
 * offset passed straight back as `offset` on the next request. When the
 * server returns `nextCursor === null` there are no more rows and
 * `hasMore` is false.
 *
 * Page 0 fetches on mount so a buyer returning from Stripe sees their
 * new purchase row immediately.
 *
 * Safe-on-unauth: with no session token we short-circuit to an empty,
 * settled state rather than firing an Authorization-less request that
 * would 401.
 */
export function useTokenHistory(): {
  items: ReadonlyArray<TokenHistoryItem>;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
} {
  const [items, setItems] = useState<ReadonlyArray<TokenHistoryItem>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // hasMore is true only after a successful fetch that returned a
  // non-null nextCursor. Before the first load settles it is false so
  // the "Load more" button never flashes during the initial skeleton.
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    if (!getSessionToken()) {
      // Unauth: settle empty, no error, no more pages.
      setItems([]);
      setCursor(null);
      setHasMore(false);
      setError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get<TokenHistoryResponse>(
        `/tokens/history?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      setItems((prev) =>
        append ? [...prev, ...res.items] : [...res.items],
      );
      setCursor(res.nextCursor);
      setHasMore(res.nextCursor !== null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setCursor(null);
    await fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || cursor === null) return;
    const offset = Number.parseInt(cursor, 10);
    if (Number.isNaN(offset)) return;
    await fetchPage(offset, true);
  }, [loading, cursor, fetchPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(0, false);
  }, [fetchPage]);

  return { items, loading, error, hasMore, loadMore, reload };
}
