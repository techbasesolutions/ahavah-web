import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError, apiClient } from "@/lib/api-client";
import type { SearchResponse } from "@/lib/api-types";
import { buildSearchPath, useDiscoverDeck } from "@/lib/use-discover-deck";

// Each test stubs apiClient.get with a vi.fn so we can observe the exact
// path that was requested and control the response. spy-restoration in
// afterEach prevents bleed across tests.
const originalGet = apiClient.get;

describe("buildSearchPath", () => {
  it("returns bare /search when no cursor or filters", () => {
    expect(buildSearchPath(null, {})).toBe("/search");
  });

  it("preserves cursor through the URL", () => {
    expect(buildSearchPath("abc123", {})).toBe("/search?cursor=abc123");
  });

  it("joins filter params with cursor", () => {
    const path = buildSearchPath("next-page", {
      ageMin: 22,
      ageMax: 45,
      countries: ["BB", "JM"],
      languages: ["en", "es"],
    });
    expect(path).toContain("cursor=next-page");
    expect(path).toContain("age_min=22");
    expect(path).toContain("age_max=45");
    // URLSearchParams %-encodes the comma; both forms acceptable.
    expect(path).toMatch(/countries=BB(%2C|,)JM/);
    expect(path).toMatch(/languages=en(%2C|,)es/);
  });

  it("omits empty filter arrays", () => {
    const path = buildSearchPath(null, { countries: [], languages: [] });
    expect(path).toBe("/search");
  });
});

describe("useDiscoverDeck", () => {
  beforeEach(() => {
    apiClient.get = vi.fn() as unknown as typeof apiClient.get;
  });

  afterEach(() => {
    apiClient.get = originalGet;
    vi.restoreAllMocks();
  });

  // Test 1 - empty initial result. /search returns 0 candidates +
  // next_cursor null; hook should land at items=[], hasMore=false.
  // hasLoadedOnce latches true once the first response lands, so the
  // consumer can tell "confirmed empty" apart from "never fetched".
  it("renders empty items when /search returns no results", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      results: [],
      next_cursor: null,
    } satisfies SearchResponse);

    const { result } = renderHook(() => useDiscoverDeck({}));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasLoadedOnce).toBe(true);
  });

  // Test 2 - single page. Three candidates returned, next_cursor null.
  it("loads a single page of candidates", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      results: [
        // The hook adapts raw /search rows at the boundary: candidate.id
        // is mapped from `prospect_uuid` (Q_CACHED_SEARCH) or `uuid`
        // (Q_UNCACHED_SEARCH), NEVER from a raw `id` field - the backend's
        // integer person.id must not leak into candidate.id (likes would
        // silently fail to persist; see the adapter comment in the hook).
        // Only the mapped id is asserted, so the row shapes stay minimal.
        { uuid: "alice" },
        { uuid: "bob" },
        { uuid: "carol" },
      ],
      next_cursor: null,
    } as unknown as SearchResponse);

    const { result } = renderHook(() => useDiscoverDeck({}));
    await waitFor(() => expect(result.current.items.length).toBe(3));

    expect(result.current.items.map((c) => c.id)).toEqual([
      "alice",
      "bob",
      "carol",
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  // Test 3 - two pages. First fetch returns cursor "p2"; loadMore() then
  // appends a second batch and sets hasMore false. Rows carry `uuid`
  // because the adapter maps candidate.id from prospect_uuid/uuid only.
  it("paginates across two pages and preserves cursor in second request", async () => {
    const getMock = apiClient.get as ReturnType<typeof vi.fn>;
    getMock
      .mockResolvedValueOnce({
        results: [{ uuid: "alice" }, { uuid: "bob" }],
        next_cursor: "p2",
      } as unknown as SearchResponse)
      .mockResolvedValueOnce({
        results: [{ uuid: "carol" }, { uuid: "dan" }],
        next_cursor: null,
      } as unknown as SearchResponse);

    const { result } = renderHook(() => useDiscoverDeck({}));
    await waitFor(() => expect(result.current.items.length).toBe(2));
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items.map((c) => c.id)).toEqual([
      "alice",
      "bob",
      "carol",
      "dan",
    ]);
    expect(result.current.hasMore).toBe(false);

    // The second invocation carries the cursor from page 1's response.
    expect(getMock).toHaveBeenCalledTimes(2);
    const secondCallPath = getMock.mock.calls[1]?.[0] as string;
    expect(secondCallPath).toContain("cursor=p2");
  });

  // Test 4 - cursor preserved on re-entry guard. Concurrent loadMore() calls
  // during an in-flight fetch should not double-request the same cursor.
  // Also pins hasLoadedOnce's latch semantics: false while the very first
  // request is still in flight, true only after its response lands.
  it("guards against re-entrant loadMore (in-flight dedupe)", async () => {
    const getMock = apiClient.get as ReturnType<typeof vi.fn>;
    let resolveFirst: (value: SearchResponse) => void = () => {};
    getMock.mockReturnValueOnce(
      new Promise<SearchResponse>((resolve) => {
        resolveFirst = resolve;
      }),
    );

    const { result } = renderHook(() => useDiscoverDeck({}));

    // Fire a second loadMore while the initial fetch is still pending.
    await act(async () => {
      void result.current.loadMore();
    });

    expect(getMock).toHaveBeenCalledTimes(1);
    // First response has not landed yet, so the latch is still down.
    expect(result.current.hasLoadedOnce).toBe(false);

    await act(async () => {
      resolveFirst({
        results: [{ uuid: "alice" }],
        next_cursor: null,
      } as unknown as SearchResponse);
    });

    await waitFor(() => expect(result.current.items.length).toBe(1));
    expect(result.current.hasLoadedOnce).toBe(true);
  });

  // Test 5 - error path leaves last good state intact. First page loads
  // successfully; subsequent page rejects with an ApiError; items should
  // remain unchanged and error.status should be 500.
  it("preserves last good items when a paginated fetch errors", async () => {
    const getMock = apiClient.get as ReturnType<typeof vi.fn>;
    getMock
      .mockResolvedValueOnce({
        results: [{ uuid: "alice" }, { uuid: "bob" }],
        next_cursor: "p2",
      } as unknown as SearchResponse)
      .mockRejectedValueOnce(new ApiError(500, null, "boom"));

    const { result } = renderHook(() => useDiscoverDeck({}));
    await waitFor(() => expect(result.current.items.length).toBe(2));

    await act(async () => {
      await result.current.loadMore();
    });

    // Items stay; the hook absorbed the error into `error`.
    expect(result.current.items.map((c) => c.id)).toEqual(["alice", "bob"]);
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(500);
    // The latch counts errors as "a response landed" and never unlatches.
    expect(result.current.hasLoadedOnce).toBe(true);
  });
});
