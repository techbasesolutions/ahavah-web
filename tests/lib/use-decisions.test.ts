import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError, apiClient } from "@/lib/api-client";
import type { DecisionResponse } from "@/lib/api-types";
import { useDecisions, type DecideResult } from "@/lib/use-decisions";

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

    let outcome: DecideResult | undefined;
    await act(async () => {
      outcome = await result.current.decide("uuid-alice", "like");
    });

    expect(outcome).toEqual({ kind: "ok", matchId: null });
    expect(result.current.error).toBeNull();
    expect(result.current.pendingIds.size).toBe(0);
  });

  // Server rejects with 500 (transient error). Promise rejects, error is
  // recorded, pendingIds is empty again so the deck UI can retry.
  // (Phase 5: 429 is no longer thrown — it's a typed `quota_exceeded`
  // result. See the dedicated test below.)
  it("server rejection rethrows + clears pendingIds for rollback", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApiError(500, { reason: "boom" }, "server error"),
    );

    const { result } = renderHook(() => useDecisions());

    await act(async () => {
      await expect(result.current.decide("uuid-alice", "like")).rejects.toThrow(
        /server error/,
      );
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(500);
    expect(result.current.pendingIds.size).toBe(0);
  });

  // Phase 5: 429 from the backend is NOT thrown — it's returned as a
  // typed `quota_exceeded` result so the caller can render
  // QuotaExceededCard without a try/catch around the happy path.
  it("429 surfaces as a typed quota_exceeded result (no throw)", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApiError(
        429,
        { error: "quota_exceeded", resets_at: "2026-05-17T10:00:00Z" },
        "quota exceeded",
      ),
    );

    const { result } = renderHook(() => useDecisions());

    let outcome: DecideResult | undefined;
    await act(async () => {
      outcome = await result.current.decide("uuid-alice", "like");
    });

    expect(outcome).toEqual({
      kind: "quota_exceeded",
      resetsAt: "2026-05-17T10:00:00Z",
    });
    expect(result.current.error).toBeNull();
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

    let outcome: DecideResult | undefined;
    await act(async () => {
      outcome = await result.current.decide("uuid-bob", "like");
    });

    expect(outcome).toEqual({ kind: "ok", matchId: "m-xyz-123" });
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

    let secondOutcome: DecideResult | undefined;
    await act(async () => {
      void result.current.decide("uuid-alice", "like");
      secondOutcome = await result.current.decide("uuid-alice", "like");
    });

    expect(secondOutcome).toEqual({ kind: "ok", matchId: null });
    expect(postMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({ match: null });
    });

    await waitFor(() => expect(result.current.pendingIds.size).toBe(0));
  });
});
