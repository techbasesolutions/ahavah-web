"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import type {
  DecisionRequest,
  DecisionResponse,
} from "@/lib/api-types";
import {
  type Decision,
  type DecisionAction,
  recordDecision,
  getDecision as getDecisionPure,
  hasDecided as hasDecidedPure,
  popLastDecision,
} from "@/lib/decision-engine";
import {
  loadDecisions,
  saveDecisions,
  clearDecisions,
} from "@/lib/use-decision-storage";

/**
 * Hook driving like / nope decisions.
 *
 * Phase W (this file) layers a backend-backed `decide()` API on top of the
 * legacy local-decision surface. The two are complementary:
 *
 *   - **New HTTP path** (`decide`, `pendingIds`, `error`) — `/discover` uses
 *     this. POSTs to `/decisions` with `{ profile_uuid, decision }`, returns
 *     `{ matchId }`. Optimistic + rollback at the call site.
 *   - **Legacy local path** (`recordPass`, `recordLike`, `hasDecided`, …) —
 *     still consumed by `/map` and `/profile/[uuid]` for local-only
 *     swipe-state tracking against SAMPLE_PROFILES. These are no-op on the
 *     server and persist only to localStorage.
 *
 * Wire contract (per Phase W F.3 — `src/lib/api-types.ts` published shapes):
 *   POST /decisions
 *     body:  { profile_uuid: string; decision: "like" | "nope" }
 *     200:   { match: { match_id, with_profile_id } | null }
 *
 * Today the backend exposes `POST /skip/by-uuid/<prospect_uuid>` as the only
 * legacy swipe endpoint (pass-only, no like, no mutual-match return). The
 * orchestrator's Phase W F.3 brief declared `/decisions` as the unified
 * forward path; this hook targets that. If the backend hasn't shipped it
 * yet, calls return an ApiError and the caller's optimistic UI rolls back
 * — symmetric with the seeded-empty `/search` caveat in the brief.
 */

export type DecideOutcome = {
  /** Null when no mutual match; opaque id when a match was created. */
  matchId: string | null;
};

/**
 * Phase 5 (monetization-tokens) — `decide()` no longer throws on the
 * 10/day quota hit. The caller receives a discriminated result so it
 * can render the QuotaExceededCard without a try/catch around the
 * happy path.
 *
 * Other ApiErrors (network, 4xx, 5xx) still throw — quota_exceeded is
 * the only non-throwing failure mode.
 */
export type DecideResult =
  | { kind: "ok"; matchId: string | null }
  | { kind: "quota_exceeded"; resetsAt: string | null };

export type UseDecisionsResult = {
  // --- new HTTP path -----------------------------------------------------

  /**
   * POST a like/nope to the backend. Returns a discriminated
   * `DecideResult` — `kind: "ok"` for the happy path, `kind:
   * "quota_exceeded"` when the free user hit the 10/day cap.
   * Throws ApiError for all other failures (network / 4xx / 5xx).
   */
  decide: (
    candidateId: string,
    decision: "like" | "nope",
  ) => Promise<DecideResult>;
  /** Ids with an in-flight decision request. UI can dim or animate. */
  pendingIds: ReadonlySet<string>;
  /** Most recent error from a decide call; null after a clean call. */
  error: ApiError | null;

  // --- legacy local-decision surface (used by /map + /profile/[uuid]) ----

  /** Local-only decision log (legacy). */
  decisions: ReadonlyArray<Decision>;
  /** Local-only: record a pass against a candidate id. */
  recordPass: (subjectId: string) => void;
  /** Local-only: record a like against a candidate id. */
  recordLike: (subjectId: string) => void;
  /** Local-only: lookup. Returns the full Decision record, or null. */
  getDecision: (subjectId: string) => Decision | null;
  /** Local-only: predicate variant of getDecision. */
  hasDecided: (subjectId: string) => boolean;
  /** Local-only: clear all recorded decisions (resets the deck). */
  clearAll: () => void;
  /** Local-only: pop the most recent decision (undo). */
  popLast: () => void;
  /** True when the legacy local store has been hydrated from localStorage. */
  loaded: boolean;
};

export function useDecisions(): UseDecisionsResult {
  // ---------------------------------------------------------------------
  // New HTTP path state
  // ---------------------------------------------------------------------
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<ApiError | null>(null);
  const inFlight = useRef<Set<string>>(new Set());

  const decide = useCallback(
    async (
      candidateId: string,
      decision: "like" | "nope",
    ): Promise<DecideResult> => {
      if (inFlight.current.has(candidateId)) {
        // Already decided; return a benign no-match outcome rather than
        // throwing — callers should treat this as idempotent.
        return { kind: "ok", matchId: null };
      }
      inFlight.current.add(candidateId);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.add(candidateId);
        return next;
      });

      try {
        const body: DecisionRequest = {
          profile_uuid: candidateId,
          decision,
        };
        const res = await apiClient.post<DecisionResponse>("/decisions", body);
        setError(null);
        return { kind: "ok", matchId: res.match?.match_id ?? null };
      } catch (e) {
        // Phase 5: 429 = daily like-quota exceeded. Don't throw —
        // surface it as a typed result so /discover can render the
        // QuotaExceededCard without unwinding through a catch block.
        if (e instanceof ApiError && e.status === 429) {
          const data = e.body as { resets_at?: string | null } | undefined;
          setError(null);
          return {
            kind: "quota_exceeded",
            resetsAt: data?.resets_at ?? null,
          };
        }
        const apiErr =
          e instanceof ApiError
            ? e
            : new ApiError(0, null, e instanceof Error ? e.message : "Network error");
        setError(apiErr);
        throw apiErr;
      } finally {
        inFlight.current.delete(candidateId);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      }
    },
    [],
  );

  // ---------------------------------------------------------------------
  // Legacy local-decision surface (unchanged behaviour from pre-Phase W)
  // ---------------------------------------------------------------------
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecisions(loadDecisions());
    setLoaded(true);
  }, []);

  const record = useCallback((subjectId: string, action: DecisionAction) => {
    setDecisions((prev) => {
      const next = recordDecision(prev, { subjectId, action });
      saveDecisions(next);
      return next;
    });
  }, []);

  const recordPass = useCallback(
    (subjectId: string) => record(subjectId, "pass"),
    [record],
  );
  const recordLike = useCallback(
    (subjectId: string) => record(subjectId, "like"),
    [record],
  );
  const clearAll = useCallback(() => {
    setDecisions([]);
    clearDecisions();
  }, []);
  const popLast = useCallback(() => {
    setDecisions((prev) => {
      const { rest } = popLastDecision(prev);
      saveDecisions(rest);
      return rest;
    });
  }, []);
  const getDecision = useCallback(
    (subjectId: string) => getDecisionPure(decisions, subjectId),
    [decisions],
  );
  const hasDecided = useCallback(
    (subjectId: string) => hasDecidedPure(decisions, subjectId),
    [decisions],
  );

  return {
    // new HTTP path
    decide,
    pendingIds,
    error,
    // legacy local path
    decisions,
    recordPass,
    recordLike,
    getDecision,
    hasDecided,
    clearAll,
    popLast,
    loaded,
  };
}
