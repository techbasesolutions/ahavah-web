"use client";

import { motion } from "motion/react";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { Label } from "@/components/ui/label";
import { NumberStepper } from "@/components/ui/number-stepper";
import { useProfile } from "@/lib/use-profile";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const MIN_CHILDREN = 0;
const MAX_CHILDREN = 20;

export default function ChildrenStep() {
  const { profile, update } = useProfile();
  const value = profile.children;
  const isComplete = value !== undefined;

  const handleChange = (next: number) => {
    update({ children: next });
  };

  return (
    <OnboardingShell
      href="/onboarding/children"
      ctaDisabled={!isComplete}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          How many children do you have<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">
          Tap zero if you have no children.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-10 flex flex-col items-center gap-3"
      >
        <Label className="sr-only" htmlFor="children-stepper-readout">
          Number of children
        </Label>
        <NumberStepper
          value={value ?? 0}
          onChange={handleChange}
          min={MIN_CHILDREN}
          max={MAX_CHILDREN}
          step={1}
          ariaLabel="Number of children"
        />
        <p className="text-caption text-text-muted">
          From 0 to {MAX_CHILDREN}.
        </p>
      </motion.div>
    </OnboardingShell>
  );
}
