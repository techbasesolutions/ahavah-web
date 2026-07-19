"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import type { VisitorRecord, VisitorsResponse } from "@/lib/api-types";

/**
 * Who-viewed-you data hook (2026-07-19). Fetches GET /visitors on
 * mount; exposes both directions plus the new-view count that drives
 * the profile entry-row pill and the Viewed-you tab pill.
 *
 * markChecked() POSTs /mark-visitors-checked, which resets the
 * member's is_new clock server-side. The CURRENT response keeps its
 * is_new flags (they were computed at query time), so the New group
 * still renders for this visit and clears on the next one — exactly
 * the SOT's "the pill clears when the page is opened" behavior.
 */

type VisitorsState =
  | { kind: "loading" }
  | { kind: "happy"; data: VisitorsResponse }
  | { kind: "error"; message: string };

export function useVisitors() {
  const [state, setState] = useState<VisitorsState>({ kind: "loading" });

  const fetchVisitors = useCallback(async () => {
    try {
      const data = await apiClient.get<VisitorsResponse>("/visitors");
      setState({ kind: "happy", data });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load views.";
      setState({ kind: "error", message: msg });
    }
  }, []);

  // Mount-driven async fetch that owns its own state transitions — the
  // canonical pattern in this codebase (see /matches' fetch trio).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchVisitors();
  }, [fetchVisitors]);

  const visitedYou: ReadonlyArray<VisitorRecord> = useMemo(
    () => (state.kind === "happy" ? state.data.visited_you : []),
    [state],
  );
  const youVisited: ReadonlyArray<VisitorRecord> = useMemo(
    () => (state.kind === "happy" ? state.data.you_visited : []),
    [state],
  );

  const newCount = useMemo(
    () => visitedYou.filter((v) => v.is_new).length,
    [visitedYou],
  );

  const markChecked = useCallback(async () => {
    try {
      await apiClient.post("/mark-visitors-checked", {
        time: new Date().toISOString(),
      });
    } catch {
      /* non-fatal — the pill just stays until a later successful check */
    }
  }, []);

  return {
    state: state.kind,
    error: state.kind === "error" ? state.message : null,
    visitedYou,
    youVisited,
    newCount,
    refresh: fetchVisitors,
    markChecked,
  };
}

/** Relative visit time in the SOT's voice: "2 hours ago", "Yesterday",
 *  "3 days ago", "Last week". Unparseable input → empty string. */
export function visitTimeLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return "Just now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}
