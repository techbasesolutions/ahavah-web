"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";

const MAX = 500;
const SOFT_MIN = 30;
const WARN_AT = Math.floor(MAX * 0.8); // 400
const ALERT_AT = Math.floor(MAX * 0.95); // 475

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function BioStep() {
  const [value, setValue] = useState("");

  // Counter color tone — neutral until the user starts; lime when there's
  // a meaningful answer; lavender as they approach the cap; pink as they
  // hit the wall. tabular-nums keeps the digit width stable so the row
  // doesn't shift as length grows.
  const counterTone =
    value.length === 0
      ? "text-text-muted"
      : value.length >= ALERT_AT
        ? "text-pink"
        : value.length >= WARN_AT
          ? "text-lavender"
          : value.length >= SOFT_MIN
            ? "text-lime"
            : "text-text-secondary";

  return (
    <OnboardingShell
      step={10}
      totalSteps={14}
      back="/onboarding/languages"
      next="/onboarding/polygyny"
      ctaLabel="Finish"
      skipHref="/onboarding/complete"
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Tell us a bit about you<span className="text-lime">.</span>
        </h1>
        <p className="text-body text-text-secondary">
          A short bio helps people start a conversation.{" "}
          <span className="font-semibold text-white">You&apos;re almost done.</span>
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-8 flex flex-1 flex-col gap-2"
      >
        <Label htmlFor="bio-input" className="text-meta text-white">
          Bio <span className="text-text-muted">(optional)</span>
        </Label>
        <Textarea
          id="bio-input"
          size="lg"
          tone="elevated"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX))}
          placeholder="I love cycling, board games, and exploring new neighborhoods…"
          aria-describedby="bio-counter bio-tip"
          className="flex-1 resize-none"
        />
        {/* Helper row: tip on the left, counter on the right. Counter
            tone shifts as the user approaches the cap so the constraint
            is felt visually, not just announced. aria-live so SRs catch
            the limit messages without re-reading the whole field. */}
        <div className="flex items-baseline justify-between gap-3">
          <span id="bio-tip" className="text-caption text-text-muted">
            Tip: 50–200 characters works well.
          </span>
          <span
            id="bio-counter"
            aria-live="polite"
            className={cn(
              "shrink-0 text-caption tabular-nums",
              counterTone,
            )}
          >
            {value.length}/{MAX}
          </span>
        </div>
      </motion.div>
    </OnboardingShell>
  );
}
