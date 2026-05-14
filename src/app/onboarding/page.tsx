"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import { BrandMark, SparkleMark } from "@/components/brand/sparkle-mark";
import { PageShell } from "@/components/app/page-shell";
import { ProgressDots } from "@/components/app/progress-dots";

const SLIDES = [
  {
    color: "#D7FF81",
    title: "Match without borders",
    body:  "People from anywhere, in any language.",
  },
  {
    color: "#BC96FF",
    title: "Built for trust",
    body:  "Verified profiles. Anti-scam protection.",
  },
  {
    color: "#FF4566",
    title: "Translated for you",
    body:  "Chat in your language. We translate in real time.",
  },
];

// Shared first-mount entrance.
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Slide-change variants — slide-left + fade on exit, slide-in-from-right
// + fade on enter. Keeps motion GPU-only (transform + opacity).
const slideVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
};

export default function OnboardingIntroPage() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <PageShell bottomPad="default" className="px-5 pt-6">
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between"
      >
        <BrandMark size="sm" />
        <Button
          nativeButton={false}
          variant="link"
          size="tap"
          className="text-text-secondary"
          render={<Link href="/onboarding/verify-email" prefetch={false} />}
        >
          Skip
        </Button>
      </motion.div>

      {/* Slide hero — sparkle in dark circle, headline, body copy.
          AnimatePresence + motion.div keyed by index gives the carousel
          a real slide transition (slide-left + fade). aria-live="polite"
          announces the new headline+body to screen readers on slide change.
          Container reserves space via flex-1; inner motion.div animates. */}
      <div
        role="region"
        aria-live="polite"
        aria-label="Onboarding carousel"
        className="relative flex flex-1 flex-col items-center justify-center gap-6 px-2 text-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center gap-6"
          >
            <IconBadge tone="elevated" shape="circle" size="hero">
              <SparkleMark size={88} color={slide.color} />
            </IconBadge>
            <h1 className="max-w-xs text-display text-white">
              {slide.title}<span className="text-lime">.</span>
            </h1>
            <p className="max-w-xs text-body leading-relaxed text-text-secondary">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.13 }}
      >
        <ProgressDots
          count={SLIDES.length}
          active={index}
          tone="lime"
          className="mb-6 justify-center"
        />
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.22 }}
      >
        {last ? (
          <Button
            nativeButton={false}
            size="cta"
            lift="float"
            // Tour ends → sign-up. Was pointing at /onboarding/verify-email
            // which expects PENDING_EMAIL_KEY in sessionStorage; a fresh
            // visitor has nothing to verify, so the page would just show
            // a blank OTP input that never resolved.
            render={<Link href="/auth/sign-up" prefetch={false} />}
          >
            Get started
          </Button>
        ) : (
          <Button
            size="cta"
            lift="float"
            onClick={() => setIndex(index + 1)}
          >
            Next
          </Button>
        )}
      </motion.div>
    </PageShell>
  );
}
