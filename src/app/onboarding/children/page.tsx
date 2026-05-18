"use client";

import { useEffect } from "react";
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

  // Default to 0 on mount so "I have no children" counts as a valid
  // answer without forcing the user to bump up then back down. Without
  // this, CTA stays disabled even though the stepper visibly reads 0.
  useEffect(() => {
    if (profile.children === undefined) {
      void update({ children: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <h1 className="text-display text-(--ink)">
          How many children do you have<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-(--ink-2)">
          Tap zero if you have no children.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.1 }}
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
        <p className="text-caption text-(--ink-3)">
          From 0 to {MAX_CHILDREN}.
        </p>
      </motion.div>
    </OnboardingShell>
  );
}
