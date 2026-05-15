"use client";

import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/lib/use-push-subscription";

/**
 * Soft opt-in for web-push notifications. Renders inline (not a modal)
 * so it doesn't hijack the user's first /matches view. Hidden when:
 *   - browser doesn't support push (Safari < 16.4, private mode, etc.)
 *   - user already granted + subscribed on this device
 *   - user denied (the prompt won't reappear; banner respects that)
 *   - user dismissed the banner within the last 14 days
 *
 * The "Enable" CTA triggers the browser permission prompt + subscription
 * + POST /notifications/subscribe in one go via the hook.
 */
export function PushOptInBanner() {
  const { state, isDismissed, subscribe, dismiss } = usePushSubscription();

  if (state === "unsupported" || state === "denied" || state === "subscribed") {
    return null;
  }
  if (isDismissed) return null;

  const isSubscribing = state === "subscribing";
  const isError = state === "error";

  return (
    <div
      role="region"
      aria-label="Notification opt-in"
      className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-bg-elevated px-4 py-3 text-body text-white"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lavender/20 text-lavender">
        <Bell className="size-4" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-meta font-medium leading-tight">
          Get notified about new matches
        </p>
        <p className="text-caption text-text-secondary leading-tight">
          {isError
            ? "Couldn't enable notifications — try again."
            : "Tap Enable to allow Ahavah to send a quick ping."}
        </p>
      </div>
      <Button
        variant="default"
        size="sm"
        disabled={isSubscribing}
        onClick={() => void subscribe()}
        className="shrink-0"
      >
        {isSubscribing ? "Enabling…" : "Enable"}
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 rounded-full p-1 text-text-secondary hover:text-white"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
