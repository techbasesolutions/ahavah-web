"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { BellRing, CheckCircle2, MailX, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { SettingsShell } from "@/components/app/settings-shell";

import { apiClient } from "@/lib/api-client";
import {
  type NotificationPreferences,
  useNotificationPreferences,
} from "@/lib/use-notification-preferences";
import { usePushSubscription } from "@/lib/use-push-subscription";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type PrefKey = keyof NotificationPreferences;

/**
 * /settings/notifications — three sections (Phase 2, mig 0029 matrix):
 *
 *   1. This device — per-device web-push state machine
 *      (usePushSubscription). Enable / test / blocked / unsupported.
 *
 *   2. What to notify me about — the per-event x per-channel matrix
 *      (useNotificationPreferences). Push column gates on this device
 *      being subscribed; Email column is always enabled.
 *
 *   3. Email — bulk "turn off all notification emails" affordance
 *      (sets all five email_* keys to false). There is NO emails_enabled
 *      column; this is a convenience batch, not a master switch.
 */
const EVENTS: ReadonlyArray<{
  label: string;
  pushKey: PrefKey;
  emailKey: PrefKey;
  description: string;
}> = [
  {
    label: "Messages",
    pushKey: "push_messages",
    emailKey: "email_messages",
    description: "Someone you matched with sent a message",
  },
  {
    label: "Matches",
    pushKey: "push_matches",
    emailKey: "email_matches",
    description: "You and someone liked each other",
  },
  {
    label: "Verification updates",
    pushKey: "push_verification",
    emailKey: "email_verification",
    description: "Your bronze, silver, or gold result",
  },
  {
    label: "Likes",
    pushKey: "push_likes",
    emailKey: "email_likes",
    description: "Someone liked your profile",
  },
  {
    label: "Profile views",
    pushKey: "push_profile_views",
    emailKey: "email_profile_views",
    description: "Someone viewed your profile",
  },
];

// The five email_* keys the bulk "turn off all" affordance clears.
const EMAIL_KEYS: ReadonlyArray<PrefKey> = EVENTS.map((e) => e.emailKey);

export default function NotificationsSettingsPage() {
  const push = usePushSubscription();
  const prefs = useNotificationPreferences();

  const pushSubscribed = push.state === "subscribed";

  const happy = prefs.state.kind === "happy" ? prefs.state : null;
  const loading = prefs.state.kind === "loading";

  const [testing, setTesting] = useState(false);
  const [clearingEmail, setClearingEmail] = useState(false);

  const sendTest = async () => {
    if (testing) return;
    setTesting(true);
    try {
      await apiClient.post("/notifications/test");
      toast.success("Test sent. Watch for it on this device.");
    } catch {
      toast.error("Couldn't send the test. Try again.");
    } finally {
      setTesting(false);
    }
  };

  const turnOffAllEmail = async () => {
    if (clearingEmail || !happy) return;
    setClearingEmail(true);
    try {
      // setOne PATCHes one field at a time so a single failure rolls
      // back only its own toggle. Run them in sequence to keep the
      // optimistic state coherent.
      for (const key of EMAIL_KEYS) {
        await prefs.setOne(key, false);
      }
      toast.success("All notification emails turned off.");
    } finally {
      setClearingEmail(false);
    }
  };

  return (
    <SettingsShell title="Notifications">
      <div className="flex flex-col gap-6 px-3 pt-4 md:px-0 md:pt-0">
        {/* ── 1. This device ─────────────────────────────────────────── */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-(--ink-3)">This device</h2>
          <Card tone="default">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <IconBadge
                  tone={pushSubscribed ? "success" : "brand"}
                  size="md"
                  aria-hidden
                >
                  {pushSubscribed ? <CheckCircle2 /> : <BellRing />}
                </IconBadge>
                <div className="flex-1 min-w-0">
                  <p className="text-meta font-bold text-(--ink)">
                    {push.state === "subscribed"
                      ? "Active on this device"
                      : "Push on this device"}
                  </p>
                  <p className="mt-0.5 text-caption leading-relaxed text-(--ink-3)">
                    {push.state === "unsupported"
                      ? "Push isn't available in this browser. On iPhone or iPad, add Ahavah to your Home Screen first, then come back here."
                      : push.state === "denied"
                        ? "Push is blocked at the browser or OS level. Re-enable notifications for Ahavah in your browser site settings, then reload this page."
                        : push.state === "error"
                          ? "Something went wrong setting up push. Try again in a moment."
                          : push.state === "subscribed"
                            ? "You'll get a ping on this device when something happens in Ahavah."
                            : "Get a ping on this device when something happens in Ahavah."}
                  </p>
                </div>
              </div>

              {/* State-specific action row */}
              {push.state === "subscribed" ? (
                <Button
                  variant="outlineSubtle"
                  size="tap"
                  className="self-start"
                  onClick={() => void sendTest()}
                  disabled={testing}
                >
                  <Send className="size-4" aria-hidden />
                  {testing ? "Sending…" : "Send a test notification"}
                </Button>
              ) : push.state === "denied" ||
                push.state === "unsupported" ? null : (
                <Button
                  size="tap"
                  tone="cta"
                  className="self-start"
                  onClick={() => void push.subscribe()}
                  disabled={push.state === "subscribing"}
                >
                  <BellRing className="size-4" aria-hidden />
                  {push.state === "subscribing"
                    ? "Enabling…"
                    : "Enable push on this device"}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* ── 2. What to notify me about ─────────────────────────────── */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.13 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-(--ink-3)">
            What to notify me about
          </h2>

          {/* Shared channel header — rendered ONCE above the matrix. Each
              column is w-14 (56px) to sit centered over the Switch tap
              area below. */}
          <div className="flex items-center gap-2.5 px-3 pb-1">
            <span className="flex-1" aria-hidden />
            <span className="w-14 text-center text-overline text-(--ink-3)">
              Push
            </span>
            <span className="w-14 text-center text-overline text-(--ink-3)">
              Email
            </span>
          </div>

          <ItemGroup className="gap-1">
            {EVENTS.map((ev) => {
              const pushValue = happy ? happy.prefs[ev.pushKey] : false;
              const emailValue = happy ? happy.prefs[ev.emailKey] : false;
              const savingPush = happy?.savingKey === ev.pushKey;
              const savingEmail = happy?.savingKey === ev.emailKey;
              return (
                <Item key={ev.label} variant="muted">
                  <ItemContent className="flex-1">
                    <ItemTitle className="text-meta font-bold text-(--ink)">
                      {ev.label}
                    </ItemTitle>
                    <ItemDescription className="text-caption text-(--ink-3)">
                      {ev.description}
                    </ItemDescription>
                  </ItemContent>

                  {/* Push column */}
                  <div className="flex w-14 shrink-0 items-center justify-center">
                    {loading ? (
                      <Skeleton className="h-5 w-8 rounded-full" />
                    ) : (
                      <Switch
                        checked={pushValue}
                        disabled={!happy || savingPush || !pushSubscribed}
                        onCheckedChange={(next) =>
                          void prefs.setOne(ev.pushKey, next)
                        }
                        aria-label={`Push: ${ev.label}`}
                      />
                    )}
                  </div>

                  {/* Email column */}
                  <div className="flex w-14 shrink-0 items-center justify-center">
                    {loading ? (
                      <Skeleton className="h-5 w-8 rounded-full" />
                    ) : (
                      <Switch
                        checked={emailValue}
                        disabled={!happy || savingEmail}
                        onCheckedChange={(next) =>
                          void prefs.setOne(ev.emailKey, next)
                        }
                        aria-label={`Email: ${ev.label}`}
                      />
                    )}
                  </div>
                </Item>
              );
            })}
          </ItemGroup>

          {/* Push-gated hint — only when push isn't live on this device. */}
          {!pushSubscribed ? (
            <p className="mx-3 mt-1 text-caption leading-relaxed text-(--ink-3)">
              Enable push on this device above to use the Push column.
            </p>
          ) : null}

          {/* Always-on footnote explaining the email fallback. */}
          <p className="mx-3 mt-1 text-caption leading-relaxed text-(--ink-3)">
            Email reaches you only when a push can&apos;t (no device, or push
            is off).
          </p>

          {prefs.state.kind === "error" ? (
            <p role="alert" className="mx-3 mt-1 text-caption text-pink">
              {prefs.state.message}
            </p>
          ) : null}
        </motion.section>

        {/* ── 3. Email ───────────────────────────────────────────────── */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.21 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-(--ink-3)">Email</h2>
          <Card tone="default">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <IconBadge tone="muted" size="md" aria-hidden>
                  <MailX />
                </IconBadge>
                <div className="flex-1 min-w-0">
                  <p className="text-meta font-bold text-(--ink)">
                    Notification emails
                  </p>
                  <p className="mt-0.5 text-caption leading-relaxed text-(--ink-3)">
                    Turn off every notification email in one tap. You can turn
                    individual ones back on in the matrix above.
                  </p>
                </div>
              </div>

              <Button
                variant="outlineSubtle"
                size="tap"
                className="self-start"
                onClick={() => void turnOffAllEmail()}
                disabled={!happy || clearingEmail}
              >
                <MailX className="size-4" aria-hidden />
                {clearingEmail
                  ? "Turning off…"
                  : "Turn off all notification emails"}
              </Button>

              <p className="text-caption leading-relaxed text-(--ink-3)">
                Sign-in and security emails are always sent.
              </p>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </SettingsShell>
  );
}
