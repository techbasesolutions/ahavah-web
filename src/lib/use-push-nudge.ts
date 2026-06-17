"use client";

import { useCallback, useEffect, useState } from "react";

import {
  usePushSubscription,
  type PushPermissionState,
} from "@/lib/use-push-subscription";

const COUNT_KEY = "ahavah:app-open-count";
const SESSION_COUNTED_KEY = "ahavah:app-open-counted";
const SESSION_SHOWN_KEY = "ahavah:push-nudge-shown";
const DENIED_SNOOZE_KEY = "ahavah:push-nudge-denied-until";

const NUDGE_EVERY = 3;
const DENIED_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // ~1 month

/**
 * Drives the push opt-in MODAL cadence — distinct from the passive
 * `PushOptInBanner` (which has its own 14-day dismiss). Rules, per the
 * 2026-06-17 design:
 *
 *   - "app-open" = one browser session. A `sessionStorage` guard increments
 *     the persistent counter once per launch, not once per navigation.
 *   - Not-yet-enabled users: show on every 3rd app-open (count % 3 === 0).
 *   - Already enabled (`subscribed`) or `unsupported`: never show.
 *   - `denied`: the OS won't let us re-prompt, so we don't nag every 3rd —
 *     we show at most once a month (a settings-pointer), resetting the snooze
 *     on dismiss. This is the "stop on denied but reset monthly" rule.
 *
 * A `shownThisSession` flag stops the modal re-appearing when the user
 * navigates between pages within the same qualifying session.
 */
export function usePushNudge(): {
  shouldShow: boolean;
  state: PushPermissionState;
  enable: () => Promise<void>;
  dismiss: () => void;
} {
  const { state, subscribe } = usePushSubscription();
  const [shouldShow, setShouldShow] = useState(false);

  // Count this app-open once per browser session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(SESSION_COUNTED_KEY)) {
      const next = Number(localStorage.getItem(COUNT_KEY) ?? 0) + 1;
      localStorage.setItem(COUNT_KEY, String(next));
      sessionStorage.setItem(SESSION_COUNTED_KEY, "1");
    }
  }, []);

  // Decide visibility once the push permission state has resolved. Compute
  // a single boolean then setState once (the onboarding steps use the same
  // disable for their mounted flag).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let show = false;
    if (!sessionStorage.getItem(SESSION_SHOWN_KEY)) {
      if (state === "denied") {
        const snoozedUntil = Number(
          localStorage.getItem(DENIED_SNOOZE_KEY) ?? 0,
        );
        show = Date.now() >= snoozedUntil;
      } else if (state !== "subscribed" && state !== "unsupported") {
        const count = Number(localStorage.getItem(COUNT_KEY) ?? 0);
        show = count > 0 && count % NUDGE_EVERY === 0;
      }
    }
    if (!show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldShow(false);
      return;
    }
    // Defer the show: usePushSubscription resolves "subscribed"/"granted" a
    // tick after mount (via serviceWorker.ready), so showing synchronously
    // would flash the modal at an already-subscribed user before their state
    // settles. If state changes within the delay, this effect re-runs and the
    // cleanup cancels the pending show.
    const t = setTimeout(() => setShouldShow(true), 800);
    return () => clearTimeout(t);
  }, [state]);

  const markShown = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    }
    setShouldShow(false);
  };

  const enable = useCallback(async () => {
    await subscribe();
    markShown();
  }, [subscribe]);

  const dismiss = useCallback(() => {
    if (state === "denied" && typeof window !== "undefined") {
      localStorage.setItem(
        DENIED_SNOOZE_KEY,
        String(Date.now() + DENIED_SNOOZE_MS),
      );
    }
    markShown();
  }, [state]);

  return { shouldShow, state, enable, dismiss };
}
