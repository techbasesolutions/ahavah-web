"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";

/**
 * Shape of /likes/incoming response. Mirrors MatchRecord but with
 * `liked_at` instead of `created_at`/`match_id` (no match exists yet).
 *
 * Backend route: GET /likes/incoming
 * Backend handler: service/decisions/__init__.py:get_incoming_likes
 *
 * Premium gate (Phase W cutover, 2026-05-15): non-premium users get
 * `count` only — the backend returns `likes: []` and `premium: false`.
 * The frontend renders a count + blurred placeholder grid + an upgrade
 * CTA so the user knows likes exist but must subscribe to see them.
 */
export type IncomingLike = {
  with_profile: {
    id: string;
    firstName?: string;
    age?: number;
    photo_uuids?: ReadonlyArray<string>;
  };
  liked_at: string;
};

export type IncomingLikesResponse = {
  count: number;
  likes: ReadonlyArray<IncomingLike>;
  premium: boolean;
};

export type LikesLoadState =
  | { kind: "loading" }
  | { kind: "happy"; likes: ReadonlyArray<IncomingLike>; count: number; premium: boolean }
  | { kind: "empty"; premium: boolean }
  | { kind: "locked"; count: number }
  | { kind: "error"; message: string };

/**
 * Fetches the incoming-likes feed once on mount + exposes a refresh
 * callback the caller can wire to a tab-switch / pull-to-refresh.
 *
 * State branches:
 *   loading  → first fetch in flight
 *   empty    → no incoming likes (premium or not)
 *   locked   → has likes, viewer is NOT premium → render count + paywall
 *   happy    → has likes + premium → render the grid
 *   error    → fetch failed
 *
 * No real-time updates today: chat-client doesn't broadcast like
 * events. The feed refreshes when the user re-enters the tab.
 */
export function useIncomingLikes(): {
  state: LikesLoadState;
  refresh: () => Promise<void>;
  count: number;
} {
  const [state, setState] = useState<LikesLoadState>({ kind: "loading" });

  const refresh = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await apiClient.get<IncomingLikesResponse>("/likes/incoming");
      // Tolerate the older response shape (no `count`/`premium`) by
      // deriving from `likes.length` — pre-paywall deploys returned
      // bare `{likes:[]}`. Once every droplet has the new backend
      // this fallback can go.
      const count = typeof res.count === "number" ? res.count : res.likes.length;
      const premium =
        typeof res.premium === "boolean" ? res.premium : true;

      if (count === 0) {
        setState({ kind: "empty", premium });
        return;
      }
      if (!premium) {
        setState({ kind: "locked", count });
        return;
      }
      setState({ kind: "happy", likes: res.likes, count, premium });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load likes.";
      setState({ kind: "error", message: msg });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const count =
    state.kind === "happy" || state.kind === "locked" ? state.count : 0;
  return { state, refresh, count };
}
