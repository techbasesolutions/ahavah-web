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
 * `with_profile` mirrors the matches shape so the rendering layer can
 * reuse MatchesGrid with minimal branching.
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
  likes: ReadonlyArray<IncomingLike>;
};

export type LikesLoadState =
  | { kind: "loading" }
  | { kind: "happy"; likes: ReadonlyArray<IncomingLike> }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/**
 * Fetches the incoming-likes feed once on mount + exposes a refresh
 * callback the caller can wire to a tab-switch / pull-to-refresh.
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
      if (res.likes.length === 0) {
        setState({ kind: "empty" });
      } else {
        setState({ kind: "happy", likes: res.likes });
      }
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

  const count = state.kind === "happy" ? state.likes.length : 0;
  return { state, refresh, count };
}
