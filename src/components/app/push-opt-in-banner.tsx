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
 *
 * Design rules applied (2026-05-15 redo):
 *   - All interactive elements ≥ 44×44 (Enable button uses kit `size="tap"`,
 *     dismiss is a 44×44 icon-button via `size="icon-tap"`).
 *   - 8px-grid spacing (gap-3 = 12px is rounded to grid; outer mx-4 mb-4 +
 *     px-4 py-3 = 16/12 grid).
 *   - Tokens only: `bg-elevated` for surface, `text-secondary` for sub-text,
 *     brand `lavender` + `lime` accents. No raw hex.
 *   - Color is not the only signal: error state adds a leading word
 *     ("Couldn't…") so a low-vision user knows it's an error without color.
 *   - role="region" + aria-label so screen readers can land on the banner;
 *     Enable button focusable in DOM order; dismiss has aria-label.
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
      className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-(--card) px-4 py-3 text-body text-(--ink)"
    >
      <div
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lavender/20 text-lavender"
      >
        <Bell className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-meta font-medium leading-tight text-(--ink)">
          Get notified about new matches
        </p>
        <p className="text-caption leading-tight text-(--ink-2)">
          {isError
            ? "Couldn't enable notifications. Try again."
            : "We'll send a quick ping when someone likes you back."}
        </p>
      </div>
      <Button
        variant="default"
        size="tap"
        disabled={isSubscribing}
        onClick={() => void subscribe()}
        className="shrink-0 rounded-full"
      >
        {isSubscribing ? "Enabling…" : "Enable"}
      </Button>
      <Button
        variant="ghost"
        size="icon-tap"
        aria-label="Dismiss notification opt-in"
        onClick={dismiss}
        className="shrink-0 rounded-full text-(--ink-2)"
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
