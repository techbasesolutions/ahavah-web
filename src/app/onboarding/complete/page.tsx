"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import { PageShell } from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function OnboardingCompletePage() {
  return (
    <PageShell bottomPad="default" className="px-5 pt-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {/* Hero — lime check "tada" entrance (scale 0.7 → 1 with spring
            bounce) then a slow infinite breathe (1 → 1.06 → 1). The lime
            glow ring underneath gives the celebration weight. Lucide Check
            inside an IconBadge — kit-only, no SparkleMark per the
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
          <h1 className="text-display text-white">
            You&apos;re all set<span className="text-lime">.</span>
          </h1>
          <p className="text-body leading-relaxed text-text-secondary">
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
          nativeButton={false}
          size="cta"
          tone="cta"
          lift="float"
          render={<Link href="/discover" prefetch={false} />}
        >
          Start matching
        </Button>
        <Button
          nativeButton={false}
          variant="link"
          size="tap"
          className="text-text-muted"
          render={<Link href="/profile" prefetch={false} />}
        >
          Review my profile first
        </Button>
      </motion.div>
    </PageShell>
  );
}
