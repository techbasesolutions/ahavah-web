"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import { PageShell } from "@/components/app/page-shell";
import { useProfile } from "@/lib/use-profile";

/**
 * Onboarding-complete celebration screen. Two server-touching jobs:
 *
 *   1. On mount: fire a no-op `update({})` so any partial state the
 *      wizard left in cache but never flushed to the backend gets
 *      written through. Defensive — most onboarding pages already
 *      PATCH on each change, but a missed step would leave the user's
 *      server profile out of sync with their cached one.
 *
 *   2. On "Start matching": refreshProfile() before navigating to
 *      /discover so the discover feed paints with fresh server state.
 *      If either operation fails we keep the user on this page and
 *      surface an error pill rather than dropping them on /discover
 *      with stale data.
 */

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { finishOnboarding } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graduated, setGraduated] = useState(false);

  // Graduate the onboardee into a full member on mount: POST
  // /finish-onboarding, flip the local ONBOARDED flag, then refresh /me.
  // Without this, the user stays an onboardee forever — every PATCH would
  // continue routing to /onboardee-info and /discover (which needs
  // person_id) would 401.
  useEffect(() => {
    void finishOnboarding()
      .then(() => setGraduated(true))
      .catch(() => {
        setError("We couldn't finalise your profile. Refresh and try again.");
      });
  }, [finishOnboarding]);

  const handleStartMatching = async () => {
    if (submitting) return;
    if (!graduated) {
      setError("Still finalising your profile. Give it a second.");
      return;
    }
    setError(null);
    setSubmitting(true);
    router.push("/discover");
  };

  return (
    <PageShell bottomPad="default" className="px-5 pt-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {/* Hero — lime check "tada" entrance (scale 0.7 -> 1 with spring
            bounce) then a slow infinite breathe (1 -> 1.06 -> 1). The lime
            glow ring underneath gives the celebration weight. Lucide Check
            inside an IconBadge - kit-only, no brand mark per the
            no-stickers rule (this page is not on the permitted list).
            Reduce-motion via globals.css collapses both animations. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.4,
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
          className="relative"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-lime/20 blur-2xl"
          />
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <IconBadge tone="cta" shape="circle" size="hero">
              <Check strokeWidth={2.5} />
            </IconBadge>
          </motion.div>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex max-w-sm flex-col gap-3"
        >
          <h1 className="text-display text-(--ink)">
            You&apos;re all set<span className="text-lime">.</span>
          </h1>
          <p className="text-body leading-relaxed text-(--ink-2)">
            Your profile is live. Start swiping to find people who match what
            you&apos;re looking for.
          </p>
        </motion.div>
      </div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="flex flex-col gap-3"
      >
        <Button
          size="cta"
          tone="cta"
          lift="float"
          onClick={handleStartMatching}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" />
              Finalising...
            </>
          ) : (
            "Start matching"
          )}
        </Button>
        <Button
          nativeButton={false}
          variant="link"
          size="tap"
          className="text-(--ink-3)"
          render={<Link href="/profile" prefetch={false} />}
        >
          Review my profile first
        </Button>
        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="text-center text-caption font-semibold text-pink"
          >
            {error}
          </p>
        ) : null}
      </motion.div>
    </PageShell>
  );
}
