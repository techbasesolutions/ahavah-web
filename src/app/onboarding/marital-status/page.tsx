"use client";

import { motion } from "motion/react";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { SingleSelectField } from "@/components/app/profile-field";
import {
  MARITAL_STATUSES,
  type MaritalStatus,
} from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function MaritalStatusStep() {
  const { profile, update } = useProfile();
  const value = profile.maritalStatus;
  const isComplete = value !== undefined;

  return (
    <OnboardingShell
      href="/onboarding/marital-status"
      ctaDisabled={!isComplete}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Your marital status<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">
          Be upfront. Others will see this on your profile.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-8"
      >
        <SingleSelectField<MaritalStatus>
          id="marital-status"
          label="Marital status"
          value={value}
          onValueChange={(next) => update({ maritalStatus: next })}
          options={MARITAL_STATUSES}
        />
      </motion.div>
    </OnboardingShell>
  );
}
