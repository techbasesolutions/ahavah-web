"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient, getSessionToken } from "@/lib/api-client";
import type { TokenBalanceResponse } from "@/lib/api-types";

/**
 * Hook that fetches the current user's token balance from
 * GET /tokens/balance (Phase 3 / monetization-tokens v1, 2026-05-16).
 *
 * State branches:
 *   loading → first fetch in flight
 *   happy   → fetch settled (or short-circuited when unauth)
 *   error   → fetch failed (balance falls back to 0 so callers can still
 *             render a `0` Pill without branching on the error)
 *
 * Safe-on-unauth: if no session token is present (sign-out, pre-OTP, or
 * SSR), we short-circuit with `{state: "happy", balance: 0}` instead of
 * issuing an Authorization-less request that would 401. This mirrors the
 * "render a 0 Pill when logged out" requirement from spec §4.5.
 *
 * No real-time updates today: token spend / purchase paths must call
 * `refresh()` explicitly. Once the chat-client / server-sent-events
 * channel is wired for ledger pushes, this hook can subscribe and drop
 * the manual refresh requirement.
 */
export type TokenBalanceState =
  | { state: "loading"; balance: 0 }
  | { state: "happy"; balance: number }
  | { state: "error"; balance: 0; message: string };

export function useTokenBalance(): TokenBalanceState & {
  refresh: () => Promise<void>;
} {
  const [s, setS] = useState<TokenBalanceState>({
    state: "loading",
    balance: 0,
  });

  const refresh = useCallback(async () => {
    if (!getSessionToken()) {
      setS({ state: "happy", balance: 0 });
      return;
    }
    setS({ state: "loading", balance: 0 });
    try {
      const res = await apiClient.get<TokenBalanceResponse>("/tokens/balance");
      setS({ state: "happy", balance: res.balance });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't load tokens.";
      setS({ state: "error", balance: 0, message: msg });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { ...s, refresh };
}
