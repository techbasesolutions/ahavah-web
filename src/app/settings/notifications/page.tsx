"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import { usePushSubscription } from "@/lib/use-push-subscription";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/**
 * /settings/notifications — single-toggle wired surface.
 *
 * Was previously a long-form mockup with 8 per-event toggles, every
 * one a no-op `useState` (no PATCH, no localStorage). Audit flagged
 * those as silent stubs that misled users into thinking they could
 * scope notifications.
 *
 * Replaced with a single master toggle that actually runs the push
 * subscription state machine (usePushSubscription): subscribing
 * registers with the SW, requests permission, and POSTs the
 * subscription to /notifications/subscribe; un-subscribing removes
 * the row server-side AND calls pushManager.unsubscribe() locally.
 *
 * Per-event filtering (matches / messages / likes / weekly summary)
 * isn't built yet on the backend. Surfaced as a static informational
 * note rather than fake toggles.
 */
export default function NotificationsSettingsPage() {
  const { state, subscribe, unsubscribe } = usePushSubscription();

  const isSupported = state !== "unsupported";
  const isOn = state === "subscribed";
  const isBusy = state === "subscribing";
  const isDenied = state === "denied";

  const onToggle = (next: boolean) => {
    if (!isSupported || isDenied) return;
    if (next) {
      void subscribe();
    } else {
      void unsubscribe();
    }
  };

  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to settings"
          render={<Link href="/settings" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Notifications</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Push</h2>
          <ItemGroup className="gap-1">
            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-white">
                  Enable push notifications
                </ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
                  {isDenied
                    ? "Blocked at the browser / OS level. Re-enable in Site Settings, then come back."
                    : !isSupported
                      ? "This browser doesn't support push (iOS Safari needs Add to Home Screen first)."
                      : "Get a ping when someone matches you, messages you, or likes you back."}
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={isOn}
                disabled={!isSupported || isDenied || isBusy}
                onCheckedChange={onToggle}
                aria-label="Enable push notifications"
              />
            </Item>
          </ItemGroup>
        </motion.section>

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.13 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">
            Per-event preferences
          </h2>
          <div className="mx-3 rounded-2xl bg-bg-elevated px-4 py-4 text-body text-text-secondary">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lavender/20 text-lavender"
              >
                <BellOff className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-meta text-white">
                  Granular controls coming soon
                </p>
                <p className="mt-1 text-caption leading-relaxed text-text-muted">
                  Today, push is all-or-nothing — match, message and
                  like notifications all share the master toggle above.
                  Per-event opt-out (e.g. messages only) lands in a
                  later release.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      <BottomNav />
    </PageShell>
  );
}
