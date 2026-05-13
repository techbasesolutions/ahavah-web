"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import type {
  DiscoverCandidate,
  SearchResponse,
} from "@/lib/api-types";

/**
 * Client-side filters that the discover hook forwards to the backend's
 * `GET /search` endpoint. Each field maps 1:1 onto a query-string param.
 *
 * Cardinality:
 *  - `ageMin` / `ageMax`: numeric inclusive bounds; either may be omitted.
 *  - `countries`: ISO codes (e.g. ["BB", "JM"]). Serialised comma-joined.
 *  - `languages`: ISO 639-1 codes. Serialised comma-joined.
 *
 * The backend treats empty arrays as "no filter applied" — symmetric with
 * `discover-engine.ts` semantics in the legacy local path.
 */
export type DiscoverFilters = {
  ageMin?: number;
  ageMax?: number;
  countries?: ReadonlyArray<string>;
  languages?: ReadonlyArray<string>;
};

export type UseDiscoverDeckResult = {
  items: ReadonlyArray<DiscoverCandidate>;
  loadMore: () => Promise<void>;
  isLoading: boolean;
  error: ApiError | null;
  hasMore: boolean;
};

/**
 * Build the `/search` path + query string from a cursor + filter set.
 * Exported for testability — `useDiscoverDeck` is the only runtime caller.
 */
export function buildSearchPath(
  cursor: string | null,
  filters: DiscoverFilters,
): string {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.ageMin !== undefined) {
    params.set("age_min", String(filters.ageMin));
  }
  if (filters.ageMax !== undefined) {
    params.set("age_max", String(filters.ageMax));
  }
  if (filters.countries && filters.countries.length > 0) {
    params.set("countries", filters.countries.join(","));
  }
  if (filters.languages && filters.languages.length > 0) {
    params.set("languages", filters.languages.join(","));
  }
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/**
 * Hook driving /discover's candidate deck.
 *
 * Lifecycle:
 *   - On mount + on every filter change (compared via JSON.stringify so
 *     callers don't need to memoize the filters object), the items + cursor
 *     state resets and the first page is fetched.
 *   - `loadMore()` paginates from the most-recent cursor. Re-entry is
 *     guarded via an inFlight ref — concurrent calls (e.g. SwipeDeck's
 *     onNeedMore firing while a previous prefetch is mid-air) are no-ops.
 *   - On error, the last good `items` snapshot is preserved so the UI does
 *     not jump back to empty. Caller can read `error` for a retry UI.
 *
 * No caching layer, no swr/react-query — just the apiClient + local state.
 */
export function useDiscoverDeck(
  filters: DiscoverFilters,
): UseDiscoverDeckResult {
  const [items, setItems] = useState<ReadonlyArray<DiscoverCandidate>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Re-entrancy guard — flips true at request start, false at end. Setting
  // it in a ref (not state) avoids re-render churn and races with React's
  // batched updates when SwipeDeck calls onNeedMore() during a transition.
  const inFlight = useRef(false);
  // We track the cursor in a ref alongside the state mirror because the
  // loadMore callback closes over state at render time; in the (rare) case
  // a caller calls loadMore() twice synchronously, both calls would otherwise
  // read the same stale cursor. The ref always reflects the latest known
  // cursor so the second call advances correctly.
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  // Stringify the filters to compare across renders. JSON.stringify is safe
  // here because the filter shape is plain primitives + arrays.
  const filtersKey = JSON.stringify(filters);

  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    if (!hasMoreRef.current) return;
    inFlight.current = true;
    setIsLoading(true);
    try {
      const path = buildSearchPath(cursorRef.current, filters);
      const res = await apiClient.get<SearchResponse>(path);
      setItems((prev) => [...prev, ...res.results]);
      cursorRef.current = res.next_cursor;
      setCursor(res.next_cursor);
      hasMoreRef.current = res.next_cursor !== null;
      setHasMore(res.next_cursor !== null);
      setError(null);
    } catch (e) {
      // Preserve last good items + cursor; surface the error for retry UI.
      // Non-ApiError throws (network, parse) get rewrapped so consumers
      // always see the same shape.
      if (e instanceof ApiError) {
        setError(e);
      } else {
        setError(new ApiError(0, null, e instanceof Error ? e.message : "Network error"));
      }
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
    // We intentionally exclude `filters` from the deps and use the closure-
    // captured value. Each new filter snapshot triggers the effect below
    // which resets state and calls loadMore — that's the only path that
    // changes the filters used here. Including filters as a dep would
    // re-create loadMore on every render of the parent because filters is
    // a fresh object literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    // Filter change — reset everything and refetch from the head. The
    // setState-in-effect rule warns generically here, but a filter change
    // is the only path that resets the deck, so doing it in the effect is
    // exactly correct (mirrors the use-profile pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems([]);
    setCursor(null);
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setError(null);
    void loadMore();
    // loadMore is keyed off filtersKey already; depending on it directly is
    // equivalent and lets the linter verify the dep chain.
  }, [filtersKey, loadMore]);

  // Suppress unused-var warning for the state mirror — useful for downstream
  // consumers but not read inside this hook.
  void cursor;

  return { items, loadMore, isLoading, error, hasMore };
}
