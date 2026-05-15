"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const DISMISSED_KEY = "ahavah:push-dismissed-at";
const DISMISS_REPROMPT_DAYS = 14;

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied"
  | "subscribing"
  | "subscribed"
  | "error";

/**
 * Convert a base64url-encoded VAPID public key into the Uint8Array shape
 * pushManager.subscribe() requires. Browser API doesn't accept the
 * raw string; this is the standard idiom.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Allocate a non-shared ArrayBuffer so the resulting Uint8Array is
  // typed as `Uint8Array<ArrayBuffer>` (not the broader
  // `Uint8Array<ArrayBufferLike>`). PushManager.subscribe()'s
  // applicationServerKey requires the narrower type under TS 5.7.
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Hook driving the web-push opt-in flow.
 *
 * State machine:
 *   "unsupported" — browser lacks Notification / SW / PushManager APIs
 *                   (e.g. iOS pre-16.4 Safari, anything in private mode)
 *   "default"     — supported but user hasn't granted/denied yet
 *   "granted"     — permission already granted; safe to subscribe
 *   "denied"      — user blocked; show no UI (the prompt won't reappear)
 *   "subscribing" — in-flight request to the push service
 *   "subscribed"  — subscription stored locally + posted to backend
 *   "error"       — last subscribe attempt failed (network / server)
 *
 * `subscribe()` triggers the OS permission prompt then enrolls the user.
 * `dismiss()` records a stale-prompt timestamp so the banner stops
 * nagging for `DISMISS_REPROMPT_DAYS` after the user closes it.
 */
export function usePushSubscription(): {
  state: PushPermissionState;
  isDismissed: boolean;
  subscribe: () => Promise<void>;
  dismiss: () => void;
} {
  const [state, setState] = useState<PushPermissionState>("default");
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("unsupported");
      return;
    }

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (dismissedAt > 0) {
      const ageMs = Date.now() - dismissedAt;
      const cutoff = DISMISS_REPROMPT_DAYS * 24 * 60 * 60 * 1000;
       
      setIsDismissed(ageMs < cutoff);
    }

    const perm = Notification.permission;
    if (perm === "denied") {
       
      setState("denied");
      return;
    }
    if (perm === "granted") {
      // Already granted in a prior session — check whether we still
      // have a live subscription; if not, treat as `granted` so the
      // banner can offer to wire up a fresh subscription on this device.
      void navigator.serviceWorker.ready.then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
         
        setState(existing ? "subscribed" : "granted");
      });
      return;
    }
    // Default: never asked.
     
    setState("default");
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setIsDismissed(true);
  }, []);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn("usePushSubscription: NEXT_PUBLIC_VAPID_PUBLIC_KEY missing");
      setState("error");
      return;
    }
    if (state === "unsupported" || state === "denied") return;

    setState("subscribing");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON();
      // PushSubscription.toJSON() always populates endpoint + keys when
      // `userVisibleOnly: true`; the optional chains keep TS happy.
      await apiClient.post("/notifications/subscribe", {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });

      setState("subscribed");
    } catch (err) {
      console.warn("usePushSubscription: subscribe failed", err);
      setState("error");
    }
  }, [state]);

  return { state, isDismissed, subscribe, dismiss };
}
