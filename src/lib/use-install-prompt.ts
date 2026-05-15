"use client";

import { useCallback, useEffect, useState } from "react";

const DISMISSED_KEY = "ahavah:install-dismissed-at";
const DISMISS_REPROMPT_DAYS = 14;

/**
 * Captures the browser's `beforeinstallprompt` event so we can surface
 * an in-app "Install" affordance instead of relying on the browser's
 * overflow-menu Install button (which most users never find).
 *
 * State machine:
 *   "unavailable" — already installed (display-mode: standalone),
 *                   browser doesn't support a2hs, or running in a
 *                   non-installable context. Banner stays hidden.
 *   "ios"         — iOS Safari; `beforeinstallprompt` is never fired
 *                   on iOS, so we surface a manual instruction sheet
 *                   ("Tap the Share icon → Add to Home Screen").
 *   "ready"       — Android/Chrome/Edge captured the event; tap
 *                   `prompt()` to fire the native install dialog.
 *   "installed"   — User accepted the prompt this session.
 *   "dismissed"   — User accepted OR explicitly dismissed; we hide
 *                   the banner for DISMISS_REPROMPT_DAYS.
 *
 * Important note for iOS: push notifications only work on iOS 16.4+
 * AFTER the app is installed to the home screen. So showing the
 * install prompt on iOS is a prerequisite for push to work at all.
 */
export type InstallPromptState =
  | "unavailable"
  | "ios"
  | "ready"
  | "installed"
  | "dismissed";

// Minimal shape for the BeforeInstallPromptEvent — TS lib.dom doesn't
// declare it as a known event type.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt(): {
  state: InstallPromptState;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
} {
  const [state, setState] = useState<InstallPromptState>("unavailable");
  const [deferredEvent, setDeferredEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed — `display-mode: standalone` is set when the PWA
    // is launched from the home screen on Android, and `navigator.
    // standalone` is the iOS-Safari equivalent.
    //
    // setState-in-effect is the canonical hydration pattern in this
    // codebase (see use-push-subscription.ts) — the eslint warning is
    // about cascading renders, but for a one-shot mount-time bridge of
    // browser API state into React state, it's exactly the right shape.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari extension to Navigator
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("installed");
      return;
    }

    // Recent dismissal — stay quiet for 14 days.
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (dismissedAt > 0) {
      const ageMs = Date.now() - dismissedAt;
      const cutoff = DISMISS_REPROMPT_DAYS * 24 * 60 * 60 * 1000;
      if (ageMs < cutoff) {
        setState("dismissed");
        return;
      }
    }

    // iOS Safari — never fires beforeinstallprompt. Detect by UA + the
    // absence of a Chrome / Android signature. Excluding `Chrome` keeps
    // Chrome-on-iOS (which still wraps WebKit) and Android Chrome from
    // matching this branch.
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isSafari =
      /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/i.test(ua);
    if (isIos && isSafari) {
      setState("ios");
      return;
    }

    // Android Chrome / Edge / etc. — listen for the install event and
    // hold the deferred prompt. The event MUST be captured the moment
    // it fires; if we wait the user gesture chain breaks.
    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setDeferredEvent(evt);
      setState("ready");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // App-installed event — fired after the user accepts the native
    // dialog. Lock the banner away in that case.
    const installedHandler = () => {
      setState("installed");
      setDeferredEvent(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setState("dismissed");
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return;
    try {
      await deferredEvent.prompt();
      const { outcome } = await deferredEvent.userChoice;
      if (outcome === "accepted") {
        setState("installed");
      } else {
        // User said "Not now" in the native dialog — treat as a
        // 14-day dismissal so we don't badger them.
        dismiss();
      }
    } catch {
      // The prompt can throw if called outside a user gesture; just
      // hide it rather than leaving a broken affordance up.
      dismiss();
    } finally {
      setDeferredEvent(null);
    }
  }, [deferredEvent, dismiss]);

  return { state, promptInstall, dismiss };
}
