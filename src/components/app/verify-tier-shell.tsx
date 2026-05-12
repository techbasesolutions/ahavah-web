"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

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

/**
 * Shared chrome for the three verification-tier flows (D2 bronze, D3 silver,
 * D4 gold). Each flow is a single-screen pre-flight: hero icon (tier-tinted),
 * sub-line, ordered list of steps, primary CTA, "what we collect" disclosure.
 *
 * `tierColor` drives the data-driven brand tint (--tier-color is the same
 * variable Card.tier uses for its gradient + ring). One inline style on the
 * outer Card to set --tier-color; everything below reads it.
 */

export type VerifyStep = {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

type Props = {
  /** Bronze / Silver / Gold. */
  tierLabel: string;
  /** Hex colour driving the --tier-color CSS var. */
  tierColor: string;
  /** Big icon at the top of the tier card. */
  HeroIcon: React.ComponentType<{ className?: string }>;
  /** Sub-line under the H1 (e.g. "Profile verified"). */
  subline: string;
  /** Long-form explanation of what this tier means. */
  description: string;
  /** Ordered checklist of steps in the flow. */
  steps: ReadonlyArray<VerifyStep>;
  /** Primary CTA copy (e.g. "Open camera"). */
  ctaLabel: string;
  /** Optional onClick — if omitted, CTA renders as a no-op pill. */
  onCtaClick?: () => void;
  /** Privacy / data disclosure text shown below the CTA. */
  disclosure: string;
};

export function VerifyTierShell({
  tierLabel,
  tierColor,
  HeroIcon,
  subline,
  description,
  steps,
  ctaLabel,
  onCtaClick,
  disclosure,
}: Props) {
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
        <PageHeaderTitle>{tierLabel}</PageHeaderTitle>
      </PageHeader>

      {/* Ambient atmosphere — soft radial glow in tier color behind the
          hero. Gives the page depth/identity instead of flat black canvas.
          aria-hidden + pointer-events-none so it's purely decorative.
          Radial-gradient via Tailwind arbitrary value reads --tier-color
          from the wrapper below (CSS variable cascades through). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-112 bg-[radial-gradient(ellipse_at_50%_0%,var(--tier-color)_0%,transparent_65%)] opacity-25 blur-3xl"
        style={{ "--tier-color": tierColor } as React.CSSProperties}
      />

      <div
        className="relative z-10 flex flex-1 flex-col gap-7 px-5 pt-2"
        style={{ "--tier-color": tierColor } as React.CSSProperties}
      >
        {/* Hero — premium tier disc with rotating metallic shimmer. The
            conic-gradient sweep imitates the polished-metal sheen of a
            real verification token. Pure transform animation (rotate),
            GPU-only. Disabled under prefers-reduced-motion via the global
            stylesheet. */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0 }}
          className="flex flex-col items-center gap-5 py-4 text-center"
        >
          <div className="relative">
            {/* Outer glow halo — tier-color, blurred, sits behind the disc.
                `scale-150` grows the halo 50% larger than the disc so it
                bleeds outward into a soft tier-color glow. */}
            <span
              aria-hidden
              className="absolute inset-0 scale-150 rounded-full bg-(--tier-color) opacity-30 blur-2xl"
            />
            {/* The disc itself */}
            <IconBadge tone="tier" size="2xl" className="relative">
              <HeroIcon />
            </IconBadge>
            {/* Metallic shimmer sweep — conic-gradient rotated continuously.
                bg + mix-blend-overlay via Tailwind classes. */}
            <motion.span
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.28)_90deg,transparent_180deg,transparent_360deg)] mix-blend-overlay"
            />
          </div>

          <div className="flex flex-col gap-2 max-w-sm">
            <h2 className="text-h2 leading-tight text-white">{subline}</h2>
            <p className="text-body leading-relaxed text-text-secondary">
              {description}
            </p>
          </div>
        </motion.div>

        {/* Steps as a vertical timeline — tier-colored numbered badges
            connected by a subtle vertical line. Replaces the generic
            ItemGroup row pattern (which looked like Settings list rows
            and lost the "premium tier flow" character). Semantic <ol> so
            SRs still read this as an ordered list. */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.06 }}
          className="flex flex-col gap-4"
          aria-label="How it works"
        >
          <h2 className="text-overline text-text-muted">How it works</h2>
          {/* The vertical connector line is a div sibling to the ol so the
              ol's only direct children are <li>s (a11y-correct list
              structure). The connector is absolutely positioned relative
              to the wrapper. */}
          <div className="relative">
            <span
              aria-hidden
              className="absolute top-5 bottom-5 left-5 z-0 w-px bg-white/10"
            />
            <ol className="flex flex-col gap-5">
              {steps.map((step, i) => (
                <li key={step.title}>
                  <motion.div
                    {...fadeUp}
                    transition={{ duration: 0.25, delay: 0.1 + Math.min(i, 4) * 0.03 }}
                    className="relative flex items-start gap-4"
                  >
                    {/* Tier-colored numbered badge — IconBadge primitive
                        with the new `tierOutlined` tone (bg-canvas + tier-
                        color ring + tier-color content). Holds the step
                        number as text content rather than an icon. */}
                    <IconBadge
                      tone="tierOutlined"
                      shape="circle"
                      size="md"
                      className="relative z-10 text-meta font-bold tabular-nums tracking-tight"
                      aria-hidden
                    >
                      {i + 1}
                    </IconBadge>
                    <div className="flex-1 pt-1.5">
                      <p className="text-meta font-semibold text-white">
                        {step.title}
                      </p>
                      <p className="mt-1 text-caption leading-relaxed text-text-muted">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                </li>
              ))}
            </ol>
          </div>
        </motion.section>

        {/* CTA block — "Takes ~60 seconds." promise above, lavender brand
            Button with tier-color ring (primary action color + tier signal),
            disclosure below. The brand-color CTA fixes the prior silver/
            gold "looks disabled" problem (was tier-colored bg → washed out
            on silver/gold) — now CTA is always clearly primary, tier signal
            comes through the ring. */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.22 }}
          className="mt-auto flex flex-col gap-3 pt-2 pb-2"
        >
          <p className="text-center text-caption text-text-muted">
            Takes about 60 seconds.
          </p>
          <Button
            size="cta"
            tone="brand"
            lift="float"
            className="ring-2 ring-(--tier-color) ring-offset-2 ring-offset-bg-canvas"
            onClick={onCtaClick}
          >
            {ctaLabel}
          </Button>
          <p className="text-center text-caption leading-relaxed text-text-muted">
            {disclosure}
          </p>
        </motion.div>
      </div>
    </PageShell>
  );
}
