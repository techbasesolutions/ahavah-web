"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import type { DiscoverCandidate } from "@/lib/api-types";
import { cdnUrlFor } from "@/lib/photo-storage";
import type { PhotoRecord } from "@/lib/photo-types";

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
  // Phase W: filter discover pool to verified prospects only. Driven by
  // either the discover-sheet toggle or the privacy setting "Require my
  // matches to be verified" (the wrapper OR's both at the call site).
  // Backend treats undefined and false identically.
  verifiedOnly?: boolean;
  // Phase W cutover (2026-05-15) — Torah-observant + Duolicious filter
  // sheet fields. All wire through to /search via comma-joined query
  // params and the backend filters against p.ahavah_extra->>'<field>'
  // (the canonical store; upstream Duolicious columns are coarse and
  // lossy). Empty array / undefined = no filter.
  intents?: ReadonlyArray<string>;
  maritalStatuses?: ReadonlyArray<string>;
  hasChildrenBuckets?: ReadonlyArray<"has" | "none">;
  assemblies?: ReadonlyArray<string>;
  torahLevels?: ReadonlyArray<string>;
  polygynyStances?: ReadonlyArray<string>;
  calendars?: ReadonlyArray<string>;
  educations?: ReadonlyArray<string>;
  healthTags?: ReadonlyArray<string>;
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
  if (filters.verifiedOnly) {
    params.set("verified_only", "1");
  }
  // Pill-grid filters — comma-joined enum values. Backend filters
  // against ahavah_extra JSONB so kebab-case client values round-trip
  // exactly (avoids the lossy enum-table joins for re-married / etc.).
  if (filters.intents?.length) {
    params.set("intents", filters.intents.join(","));
  }
  if (filters.maritalStatuses?.length) {
    params.set("marital_statuses", filters.maritalStatuses.join(","));
  }
  if (filters.hasChildrenBuckets?.length) {
    params.set("has_children", filters.hasChildrenBuckets.join(","));
  }
  if (filters.assemblies?.length) {
    params.set("assemblies", filters.assemblies.join(","));
  }
  if (filters.torahLevels?.length) {
    params.set("torah_levels", filters.torahLevels.join(","));
  }
  if (filters.polygynyStances?.length) {
    params.set("polygyny", filters.polygynyStances.join(","));
  }
  if (filters.calendars?.length) {
    params.set("calendars", filters.calendars.join(","));
  }
  if (filters.educations?.length) {
    params.set("educations", filters.educations.join(","));
  }
  if (filters.healthTags?.length) {
    params.set("health_tags", filters.healthTags.join(","));
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
  // Monotonic request counter. Each fetch captures its own seq; a stale
  // in-flight response (filter changed while the call was in flight)
  // checks the ref after every await and bails before overwriting the
  // fresher response's state. Without this a slow pagination call from
  // an old filter set would clobber the new filter set's results.
  const requestSeq = useRef(0);
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

  // Internal fetch — used by both the public `loadMore` (pagination,
  // honours the inFlight guard so SwipeDeck's onNeedMore can't queue
  // redundant page requests) and the filter-change effect (force=true,
  // bypasses the guard so a viewport change during an in-flight
  // pagination call doesn't get silently dropped). Stale responses are
  // discarded via the requestSeq check.
  const runFetch = useCallback(async (force: boolean) => {
    if (!force && inFlight.current) return;
    if (!hasMoreRef.current) return;
    const seq = ++requestSeq.current;
    inFlight.current = true;
    setIsLoading(true);
    // Capture "is this the first page after a filter change" BEFORE the
    // network call. The filter-change effect resets cursorRef to null,
    // so the very next loadMore() starts with cursorRef.current === null
    // and needs to REPLACE items wholesale; subsequent pagination calls
    // start with a real cursor and need to APPEND. Without this split
    // pagination doubled up the deck (was solved with setItems([]) in
    // the effect, but that caused the map to blank out every pan).
    const isFirstPage = cursorRef.current === null;
    try {
      const path = buildSearchPath(cursorRef.current, filters);
      // The backend's /search returns a bare array, not {results, next_cursor}.
      // api-types.ts's SearchResponse shape was Phase W aspirational —
      // adapt by accepting either shape here. Pagination is via the
      // backend's n/o query-string args (not implemented yet on the
      // frontend), so we treat the response as a single page for now.
      const res = await apiClient.get<unknown>(path);
      // Stale-response check: if a fresher fetch superseded us while we
      // were awaiting, drop our result and let the newer call own the
      // state. Without this guard the old filter set's response could
      // overwrite items the user has since panned away from.
      if (seq !== requestSeq.current) return;
      const rawResults: ReadonlyArray<Record<string, unknown>> = Array.isArray(res)
        ? (res as Record<string, unknown>[])
        : ((res as { results?: Record<string, unknown>[] }).results ?? []);
      const nextCursor =
        Array.isArray(res)
          ? null
          : ((res as { next_cursor?: string | null }).next_cursor ?? null);
      // Adapter: backend /search returns snake_case (name, prospect_uuid,
      // location, profile_photo_uuid, ...). DiscoverCardFace reads
      // camelCase (firstName, id, city, country). Map at the boundary so
      // the rendering layer stays clean.
      const results: DiscoverCandidate[] = rawResults.map((r) => {
        const loc = typeof r.location === "string" ? r.location : "";
        // long_friendly format is "City, State, Country" — split for the
        // city display label. The COUNTRY ISO code, however, comes from
        // the dedicated `country` column on the response (not the last
        // segment of `location`, which is a country NAME and useless to
        // centroidOf which expects ISO2). /map depends on this.
        const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
        const city = parts[0];
        const countryIso =
          typeof r.country === "string" && r.country.length === 2
            ? r.country.toUpperCase()
            : undefined;
        // Q_CACHED_SEARCH returns `photo_uuids` as a JSON array of strings
        // (position ASC). Map each to a PhotoRecord so DiscoverCardFace +
        // photoOrGradient() can treat it the same shape as /profile-info.
        // photo_uuids is `[]` when the prospect has no photos — the card
        // falls back to the deterministic gradient.
        const rawPhotoUuids = Array.isArray(r.photo_uuids)
          ? (r.photo_uuids as ReadonlyArray<unknown>).filter(
              (u): u is string => typeof u === "string" && u.length > 0,
            )
          : [];
        const photos: PhotoRecord[] = rawPhotoUuids.map((uuid, i) => ({
          uuid,
          cdn_url: cdnUrlFor(uuid),
          position: i + 1,
          moderation_state: "approved",
          nsfw_score: null,
          created_at: "",
        }));
        return {
          ...(r as Partial<DiscoverCandidate>),
          // `id` MUST be the prospect's UUID (string), not their integer
          // person.id. /decisions and /tokens/super-like both pass this
          // value as `profile_uuid` to the backend, where Q_RECORD_LIKE
          // does `uuid_or_null(%(prospect_uuid)s)` — passing an integer
          // resolves to NULL and the INSERT silently inserts nothing.
          // Symptom: likes never persist; the candidate keeps reappearing
          // on every deck refresh (search excludes via `liked.liker_id =
          // me AND liked_id = p.id`, which can never match an empty row).
          // Field names differ between Q_UNCACHED_SEARCH (returns `uuid`
          // and integer `id`) and Q_CACHED_SEARCH (returns `prospect_uuid`
          // and `prospect_person_id`); fall back through the UUID-bearing
          // names only, never the integer ones.
          id: (r.prospect_uuid as string | undefined) ?? (r.uuid as string | undefined) ?? "",
          firstName: (r.name as string | undefined) ?? (r.firstName as string | undefined),
          age: r.age as number | undefined,
          city: city || undefined,
          country: countryIso,
          photos,
          // seconds_since_last_online — drives the green-dot / "Last seen
          // Xm ago" affordance on the discover card. NULL upstream when
          // the prospect has never been signed in; we leave it as
          // undefined and let formatLastSeen() default to "recently".
          seconds_since_last_online:
            typeof r.seconds_since_last_online === "number"
              ? r.seconds_since_last_online
              : undefined,
          // Map opt-out flag: server returns `show_on_map` (boolean,
          // default TRUE when absent in ahavah_extra). /map filters
          // markers on `showOnMap !== false`; /discover ignores it.
          showOnMap:
            typeof r.show_on_map === "boolean" ? r.show_on_map : undefined,
        } as DiscoverCandidate;
      });
      setItems((prev) => (isFirstPage ? results : [...prev, ...results]));
      cursorRef.current = nextCursor;
      setCursor(nextCursor);
      hasMoreRef.current = nextCursor !== null;
      setHasMore(nextCursor !== null);
      setError(null);
    } catch (e) {
      // Stale-response check: see comment above on the success path.
      if (seq !== requestSeq.current) return;
      // Preserve last good items + cursor; surface the error for retry UI.
      // Non-ApiError throws (network, parse) get rewrapped so consumers
      // always see the same shape.
      if (e instanceof ApiError) {
        setError(e);
      } else {
        setError(new ApiError(0, null, e instanceof Error ? e.message : "Network error"));
      }
    } finally {
      // Only clear flags if we're still the latest call — a superseded
      // older call must leave them alone so the fresher call can own
      // them on its own completion.
      if (seq === requestSeq.current) {
        inFlight.current = false;
        setIsLoading(false);
      }
    }
    // We intentionally exclude `filters` from the deps and use the closure-
    // captured value. Each new filter snapshot triggers the effect below
    // which resets state and calls runFetch — that's the only path that
    // changes the filters used here. Including filters as a dep would
    // re-create runFetch on every render of the parent because filters is
    // a fresh object literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  // Public pagination handle — preserves the (() => Promise<void>) shape
  // of UseDiscoverDeckResult.loadMore so SwipeDeck's onNeedMore caller
  // doesn't need to know about the force flag.
  const loadMore = useCallback(() => runFetch(false), [runFetch]);

  useEffect(() => {
    // Filter change — reset pagination + error state, then refetch from
    // the head. We deliberately do NOT setItems([]) here: keeping the
    // last-known deck visible while the new fetch is in flight prevents
    // the /map markers from blanking out for ~200-500ms on every pan
    // (every pan changes the country filter via countriesInBounds).
    // loadMore() swaps items atomically when the new first page lands
    // (see `isFirstPage` branch in loadMore). The setState-in-effect
    // rule warns generically here, but a filter change is the only path
    // that triggers pagination reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCursor(null);
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setError(null);
    // force=true so a pan during an in-flight pagination call still
    // triggers a fresh fetch instead of being dropped by the guard.
    void runFetch(true);
  }, [filtersKey, runFetch]);

  // Suppress unused-var warning for the state mirror — useful for downstream
  // consumers but not read inside this hook.
  void cursor;

  return { items, loadMore, isLoading, error, hasMore };
}
