import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError, apiClient } from "@/lib/api-client";
import type { DecisionResponse } from "@/lib/api-types";
import { useDecisions } from "@/lib/use-decisions";

const originalPost = apiClient.post;

describe("useDecisions", () => {
  beforeEach(() => {
    apiClient.post = vi.fn() as unknown as typeof apiClient.post;
  });
  afterEach(() => {
    apiClient.post = originalPost;
    vi.restoreAllMocks();
  });

  // Optimistic like, no mutual match. Resolves with {matchId: null}.
  it("decide('like') without a match returns {matchId: null}", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      match: null,
    } satisfies DecisionResponse);

    const { result } = renderHook(() => useDecisions());

    let outcome: { matchId: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.decide("uuid-alice", "like");
    });

    expect(outcome).toEqual({ matchId: null });
    expect(result.current.error).toBeNull();
    expect(result.current.pendingIds.size).toBe(0);
  });

  // Server rejects with 429 (rate limit). Promise rejects, error is recorded,
  // pendingIds is empty again so the deck UI can retry.
  it("server rejection rethrows + clears pendingIds for rollback", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApiError(429, { reason: "too_fast" }, "rate limited"),
    );

    const { result } = renderHook(() => useDecisions());

    await act(async () => {
      await expect(result.current.decide("uuid-alice", "like")).rejects.toThrow(
        /rate limited/,
      );
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(429);
    expect(result.current.pendingIds.size).toBe(0);
  });

  // Mutual match returned — resolves with a non-null matchId.
  it("mutual match resolves with the server-supplied match id", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      match: {
        match_id: "m-xyz-123",
        with_profile_id: "uuid-bob",
      },
    } satisfies DecisionResponse);

    const { result } = renderHook(() => useDecisions());

    let outcome: { matchId: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.decide("uuid-bob", "like");
    });

    expect(outcome?.matchId).toBe("m-xyz-123");
  });

  // POST shape: confirm the body is {profile_uuid, decision} and the path
  // is /decisions. Catches regressions where someone routes pass to
  // /skip/by-uuid (path-param) and forgets to update the like branch.
  it("POSTs the correct shape for a 'nope' decision", async () => {
    const postMock = apiClient.post as ReturnType<typeof vi.fn>;
    postMock.mockResolvedValueOnce({ match: null } satisfies DecisionResponse);

    const { result } = renderHook(() => useDecisions());

    await act(async () => {
      await result.current.decide("uuid-carol", "nope");
    });

    expect(postMock).toHaveBeenCalledWith("/decisions", {
      profile_uuid: "uuid-carol",
      decision: "nope",
    });
  });

  // Concurrent decisions on the same id should not double-POST; the second
  // call resolves benignly without firing the network.
  it("dedupes concurrent decide() calls for the same id", async () => {
    const postMock = apiClient.post as ReturnType<typeof vi.fn>;
    let resolveFirst: (value: DecisionResponse) => void = () => {};
    postMock.mockReturnValueOnce(
      new Promise<DecisionResponse>((resolve) => {
        resolveFirst = resolve;
      }),
    );

    const { result } = renderHook(() => useDecisions());

    let secondOutcome: { matchId: string | null } | undefined;
    await act(async () => {
      void result.current.decide("uuid-alice", "like");
      secondOutcome = await result.current.decide("uuid-alice", "like");
    });

    expect(secondOutcome).toEqual({ matchId: null });
    expect(postMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({ match: null });
    });

    await waitFor(() => expect(result.current.pendingIds.size).toBe(0));
  });
});
