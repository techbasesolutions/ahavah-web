"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ScanFace } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIER_COLOR = "#C0C0C0";

/**
 * Silver tier ("liveness check") is intentionally disabled — the
 * backend integration (AWS Amplify Face Liveness per migration 0003
 * comment) was never built, and Ahavah's product constraints exclude
 * adding new paid external services right now. Page renders a clear
 * "coming soon" surface so the user understands what they're seeing,
 * with prompts toward Bronze (which works today) and Gold (which
 * works the moment Stripe keys land).
 *
 * Restore the full flow + a real CTA when AWS Liveness (or an
 * equivalent zero-cost alternative) is wired.
 */

export default function VerifySilverPage() {
  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to verification"
          render={<Link href="/verify" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Silver verification</PageHeaderTitle>
      </PageHeader>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-112 bg-[radial-gradient(ellipse_at_50%_0%,var(--tier-color)_0%,transparent_65%)] opacity-25 blur-3xl"
        style={{ "--tier-color": TIER_COLOR } as React.CSSProperties}
      />

      <div
        className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7 px-5 text-center"
        style={{ "--tier-color": TIER_COLOR } as React.CSSProperties}
      >
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-0 scale-150 rounded-full bg-(--tier-color) opacity-30 blur-2xl"
            />
            <IconBadge tone="tier" size="2xl" className="relative">
              <ScanFace />
            </IconBadge>
          </div>
          <h2 className="text-h2 leading-tight text-white">
            Silver is launching soon
          </h2>
          <p className="max-w-sm text-body leading-relaxed text-text-secondary">
            The face-liveness check needs a third-party service we
            haven&apos;t wired up yet. While we finish that, you can
            get verified with Bronze (selfie cross-check) or jump
            straight to Gold (government ID via Stripe).
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="flex w-full max-w-sm flex-col gap-3"
        >
          <Button
            size="cta"
            tone="brand"
            lift="float"
            nativeButton={false}
            render={<Link href="/verify/bronze" prefetch={false} />}
          >
            Get Bronze instead
          </Button>
          <Button
            size="cta"
            variant="outlineSubtle"
            nativeButton={false}
            render={<Link href="/verify/gold" prefetch={false} />}
          >
            Try Gold
          </Button>
        </motion.div>
      </div>
    </PageShell>
  );
}
