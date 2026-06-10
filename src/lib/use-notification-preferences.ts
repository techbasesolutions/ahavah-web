"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient, ApiError } from "@/lib/api-client";

export type NotificationPreferences = {
  push_matches: boolean;
  push_messages: boolean;
  push_likes: boolean;
  push_weekly_digest: boolean;
};

const DEFAULTS: NotificationPreferences = {
  push_matches: true,
  push_messages: true,
  push_likes: false,
  push_weekly_digest: false,
};

/**
 * useNotificationPreferences — backs the four-toggle /settings/
 * notifications page (Phase W, mig 0013).
 *
 * State machine:
 *   loading -> happy (after GET resolves)
 *           -> error (GET threw)
 *
 * setOne(key, value) optimistically updates state, fires PATCH; on
 * failure rolls back + sets error. Single-field PATCH so the user
 * doesn't lose other toggles if one save races with another.
 */
export type NotificationPreferencesState =
  | { kind: "loading" }
  | {
      kind: "happy";
      prefs: NotificationPreferences;
      savingKey: keyof NotificationPreferences | null;
    }
  | { kind: "error"; message: string };

export function useNotificationPreferences(): {
  state: NotificationPreferencesState;
  setOne: (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => Promise<void>;
} {
  const [state, setState] = useState<NotificationPreferencesState>({
    kind: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<NotificationPreferences>("/notifications/preferences")
      .then((prefs) => {
        if (cancelled) return;
        // Defensive: server may not return every key if a field was
        // added after the user's row was created. Merge with defaults.
        setState({
          kind: "happy",
          prefs: { ...DEFAULTS, ...prefs },
          savingKey: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Couldn't load notification preferences.";
        setState({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setOne = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      let snapshot: NotificationPreferences | null = null;
      setState((curr) => {
        if (curr.kind !== "happy") return curr;
        snapshot = curr.prefs;
        return {
          kind: "happy",
          prefs: { ...curr.prefs, [key]: value },
          savingKey: key,
        };
      });
      try {
        await apiClient.patch("/notifications/preferences", { [key]: value });
        setState((curr) =>
          curr.kind === "happy" ? { ...curr, savingKey: null } : curr,
        );
      } catch {
        // Rollback optimistic state.
        setState((curr) => {
          if (curr.kind !== "happy" || snapshot == null) return curr;
          return { kind: "happy", prefs: snapshot, savingKey: null };
        });
        toast.error("Couldn't save that preference — please try again.");
      }
    },
    [],
  );

  return { state, setOne };
}
