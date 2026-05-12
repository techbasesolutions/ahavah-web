"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type Decision,
  type DecisionAction,
  recordDecision,
  getDecision as getDecisionPure,
  hasDecided as hasDecidedPure,
} from "@/lib/decision-engine";
import {
  loadDecisions,
  saveDecisions,
  clearDecisions,
} from "@/lib/use-decision-storage";

/**
 * Client-side decisions hook. Reads from localStorage on mount, exposes
 * `recordPass`, `recordLike`, `getDecision`, `hasDecided`, `clearAll`.
 * Persists every write to localStorage. Symmetric with useProfile.
 */
export function useDecisions() {
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

  const getDecision = useCallback(
    (subjectId: string) => getDecisionPure(decisions, subjectId),
    [decisions],
  );
  const hasDecided = useCallback(
    (subjectId: string) => hasDecidedPure(decisions, subjectId),
    [decisions],
  );

  return {
    decisions,
    loaded,
    recordPass,
    recordLike,
    getDecision,
    hasDecided,
    clearAll,
  };
}
