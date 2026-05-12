"use client";

import { motion } from "motion/react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";

const MIN_NAME = 2;
const MAX_NAME = 30;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NameStep() {
  const { profile, update } = useProfile();
  const name = profile.firstName ?? "";
  const trimmed = name.trim();
  const isValid = trimmed.length >= MIN_NAME && trimmed.length <= MAX_NAME;

  return (
    <OnboardingShell href="/onboarding/name" ctaDisabled={!isValid}>
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          What&apos;s your name<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">
          This is what people will see.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-8 flex flex-col gap-2"
      >
        <Label htmlFor="name-input" className="text-meta text-white">
          First name
        </Label>
        <Input
          id="name-input"
          autoFocus
          size="lg"
          tone="elevated"
          value={name}
          onChange={(e) => update({ firstName: e.target.value.slice(0, MAX_NAME) })}
          placeholder="e.g. Jessica"
          aria-describedby="name-help"
          aria-invalid={name.length > 0 && !isValid}
          maxLength={MAX_NAME}
        />
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span id="name-help">
            Just your first name, change anytime in Settings.
          </span>
          <span className="tabular-nums" aria-hidden>
            {name.length}/{MAX_NAME}
          </span>
        </div>
      </motion.div>
    </OnboardingShell>
  );
}
