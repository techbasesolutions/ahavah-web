"use client";

import { motion } from "motion/react";
import { BellOff } from "lucide-react";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";

import { BackButton } from "@/components/app/back-button";
import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import {
  type NotificationPreferences,
  useNotificationPreferences,
} from "@/lib/use-notification-preferences";
import { usePushSubscription } from "@/lib/use-push-subscription";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/**
 * /settings/notifications — master push subscription + four per-event
 * preferences backed by mig 0013's notification_preference table.
 *
 *   Master push (subscribe / unsubscribe)
 *     - usePushSubscription owns the SW + VAPID + permission flow.
 *     - When OFF, the per-event toggles below disable (no subscription
 *       = nothing to gate).
 *
 *   Per-event toggles (4)
 *     - push_matches (default ON)
 *     - push_messages (default ON)
 *     - push_likes (default OFF — gated read surface)
 *     - push_weekly_digest (default OFF — feature not yet built)
 */

type ToggleKey = keyof NotificationPreferences;

const TOGGLES: ReadonlyArray<{
  key: ToggleKey;
  title: string;
  description: string;
}> = [
  {
    key: "push_matches",
    title: "Matches",
    description: "Someone you liked liked you back",
  },
  {
    key: "push_messages",
    title: "Messages",
    description: "Someone sent you a chat message",
  },
  {
    key: "push_likes",
    title: "Likes",
    description: "Someone liked your profile (premium read surface)",
  },
  {
    key: "push_weekly_digest",
    title: "Weekly digest",
    description:
      "A weekly summary of new matches and activity (coming soon)",
  },
];

export default function NotificationsSettingsPage() {
  const push = usePushSubscription();
  const prefs = useNotificationPreferences();

  const masterSupported = push.state !== "unsupported";
  const masterOn = push.state === "subscribed";
  const masterBusy = push.state === "subscribing";
  const masterDenied = push.state === "denied";

  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <BackButton fallback="/settings" label="Back to settings" />
        <PageHeaderTitle>Notifications</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        {/* Master push toggle */}
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
                  {masterDenied
                    ? "Blocked at the browser / OS level. Re-enable in Site Settings, then come back."
                    : !masterSupported
                      ? "This browser doesn't support push (iOS Safari needs Add to Home Screen first)."
                      : "Get a ping when something happens in Ahavah."}
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={masterOn}
                disabled={!masterSupported || masterDenied || masterBusy}
                onCheckedChange={(next) => {
                  if (next) void push.subscribe();
                  else void push.unsubscribe();
                }}
                aria-label="Enable push notifications"
              />
            </Item>
          </ItemGroup>
        </motion.section>

        {/* Per-event preferences */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.13 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">
            What to notify me about
          </h2>
          <ItemGroup className="gap-1">
            {(() => {
              const happy = prefs.state.kind === "happy" ? prefs.state : null;
              return TOGGLES.map((t) => {
                const value = happy ? happy.prefs[t.key] : false;
                const savingThis = happy?.savingKey === t.key;
                return (
                  <Item key={t.key} variant="muted">
                    <ItemContent>
                      <ItemTitle className="text-meta text-white">
                        {t.title}
                      </ItemTitle>
                      <ItemDescription className="text-caption text-text-muted">
                        {t.description}
                      </ItemDescription>
                    </ItemContent>
                    <Switch
                      checked={value}
                      disabled={!happy || savingThis || !masterOn}
                      onCheckedChange={(next) =>
                        void prefs.setOne(t.key, next)
                      }
                      aria-label={t.title}
                    />
                  </Item>
                );
              });
            })()}
          </ItemGroup>

          {/* Helper text when push is OFF — explain why the per-event
              toggles are disabled. */}
          {!masterOn ? (
            <p
              className="mx-3 mt-1 flex items-start gap-2 text-caption leading-relaxed text-text-muted"
              role="status"
            >
              <BellOff
                className="mt-0.5 size-3.5 shrink-0 text-text-muted"
                aria-hidden
              />
              <span>
                Turn on push above to enable per-event preferences.
                Until then nothing pushes at all.
              </span>
            </p>
          ) : null}

          {prefs.state.kind === "error" ? (
            <p role="alert" className="mx-3 mt-1 text-caption text-pink">
              {prefs.state.message}
            </p>
          ) : null}
        </motion.section>
      </div>

      <BottomNav />
    </PageShell>
  );
}
