"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";

import { LogoMark } from "@/components/brand/logo-mark";
import { Logo } from "@/components/brand/logo";
import { PageShell } from "@/components/app/page-shell";
import { ProgressDots } from "@/components/app/progress-dots";

const SLIDES = [
  {
    color: "#D7FF81",
    title: "Match without borders",
    body:  "People from anywhere who share your values.",
  },
  {
    color: "#BC96FF",
    title: "Built for trust",
    body:  "Verified profiles. Anti-scam protection.",
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
    <>
      {/* ── DESKTOP layout (≥md) ── centered card on canvas ────────────── */}
      {/*
        Per 03-onboarding.md shell pattern: centered card max-w-140 p-10
        on bg-canvas. The intro carousel is not a wizard step (no stepper
        needed here) — render a simplified card with the slide content and
        the same Get started / Next CTAs.
      */}
      <div className="hidden min-h-dvh items-center justify-center bg-(--canvas) md:flex">
        <Card className="w-full max-w-140 gap-0 rounded-2xl p-10 shadow-md">
          {/* Brand mark */}
          <div className="mb-8">
            <Logo variant="horizontal" size="md" priority />
          </div>

          {/* Slide content */}
          <div
            role="region"
            aria-live="polite"
            aria-label="Onboarding carousel"
            className="relative flex flex-col items-center gap-6 text-center"
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
                  <LogoMark size={88} decorative />
                </IconBadge>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground">
                  {slide.title}<span className="text-(--color-lime)">.</span>
                </h1>
                <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
                  {slide.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <ProgressDots
            count={SLIDES.length}
            active={index}
            tone="lime"
            className="my-8 justify-center"
          />

          {/* CTA */}
          {last ? (
            <Button
              nativeButton={false}
              size="cta"
              tone="cta"
              render={<Link href="/auth/sign-up" prefetch={false} />}
            >
              Get started
            </Button>
          ) : (
            <Button size="cta" tone="cta" onClick={() => setIndex(index + 1)}>
              Next
            </Button>
          )}
        </Card>
      </div>

      {/* ── MOBILE layout (<md) ── existing markup, untouched ─────────── */}
      <PageShell desktopShell="full-bleed" bottomPad="default" className="px-5 pt-6 md:hidden">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between"
        >
          <Logo variant="horizontal" size="sm" />
          <Button
            nativeButton={false}
            variant="link"
            size="tap"
            className="text-(--ink-2)"
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
                <LogoMark size={88} decorative />
              </IconBadge>
              <h1 className="max-w-xs text-display text-(--ink)">
                {slide.title}<span className="text-lime">.</span>
              </h1>
              <p className="max-w-xs text-body leading-relaxed text-(--ink-2)">
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
    </>
  );
}
