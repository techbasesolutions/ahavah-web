"use client";

import type { ReactNode } from "react";
import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePushNudge } from "@/lib/use-push-nudge";
import { useIsDesktop } from "@/lib/use-is-desktop";

/**
 * Push opt-in modal shown on every 3rd app-open until the user enables
 * notifications (see `usePushNudge` for the cadence + monthly-reset-on-denied
 * rules). Bottom `Sheet` on mobile, centered `Dialog` on desktop — same
 * responsive split as `block-report-sheet`. Mounted once in `PageShell`.
 *
 * Two variants:
 *   - enableable (`default`/`granted`): "Turn on notifications" → subscribe.
 *   - `denied`: the OS won't re-prompt, so we point the user to site settings
 *     and offer a single dismiss.
 */
export function PushNudgeModal() {
  const { shouldShow, state, enable, dismiss } = usePushNudge();
  const isDesktop = useIsDesktop();

  if (!shouldShow) return null;

  const isDenied = state === "denied";
  const isSubscribing = state === "subscribing";

  const icon = (
    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-lavender/20 text-lavender">
      {isDenied ? <BellOff className="size-6" /> : <Bell className="size-6" />}
    </div>
  );

  const title = isDenied
    ? "Notifications are blocked"
    : "Don't miss your match";

  const body = isDenied
    ? "You've blocked notifications for Ahavah. Turn them back on in your browser's site settings to hear when someone likes you."
    : "Turn them on and we'll tell you the moment someone likes you back or sends a message.";

  const actions: ReactNode = isDenied ? (
    <Button variant="default" size="tap" onClick={dismiss} className="w-full">
      Got it
    </Button>
  ) : (
    <>
      <Button
        variant="default"
        size="tap"
        disabled={isSubscribing}
        onClick={() => void enable()}
        className="w-full"
      >
        {isSubscribing ? "Turning on…" : "Turn on notifications"}
      </Button>
      <Button variant="ghost" size="tap" onClick={dismiss} className="w-full">
        Not now
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && dismiss()}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center gap-2 text-center">
            {icon}
            <DialogTitle className="text-h2 text-(--ink)">{title}</DialogTitle>
            <DialogDescription className="text-meta text-(--ink-2)">
              {body}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
            {actions}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && dismiss()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="items-center gap-2 px-5 pt-6 pb-2 text-center">
          {icon}
          <SheetTitle className="text-h2 text-(--ink)">{title}</SheetTitle>
          <SheetDescription className="text-meta text-(--ink-2)">
            {body}
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="flex-col gap-2 px-5 pb-6">{actions}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
