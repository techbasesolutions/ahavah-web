"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/lib/use-profile";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const MIN_CHILDREN = 0;
const MAX_CHILDREN = 20;

export default function ChildrenStep() {
  const { profile, update } = useProfile();

  // Local input state is a string so the user can type freely (including
  // empty during edits). We commit to profile.children only when the
  // parsed value is a valid integer in [0, 20]. Note: profile.children=0
  // is a VALID complete answer; the CTA-disabled / completeness check
  // therefore compares against undefined, not against truthy.
  const [raw, setRaw] = useState<string>(
    profile.children !== undefined ? String(profile.children) : "",
  );

  const parsed = Number.parseInt(raw, 10);
  const isValidInt =
    !Number.isNaN(parsed) && parsed >= MIN_CHILDREN && parsed <= MAX_CHILDREN;
  const isComplete = isValidInt && raw.trim() !== "";

  const handleChange = (next: string) => {
    // Strip non-digits for a clean typing experience.
    const sanitized = next.replace(/[^0-9]/g, "");
    setRaw(sanitized);
    const n = Number.parseInt(sanitized, 10);
    if (!Number.isNaN(n) && n >= MIN_CHILDREN && n <= MAX_CHILDREN) {
      update({ children: n });
    }
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
          Enter 0 if you have no children.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-8 flex flex-col gap-2"
      >
        <Label htmlFor="children" className="text-meta text-white">
          Number of children
        </Label>
        <Input
          id="children"
          size="lg"
          tone="elevated"
          type="number"
          inputMode="numeric"
          min={MIN_CHILDREN}
          max={MAX_CHILDREN}
          step={1}
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0"
          aria-describedby="children-help"
          aria-invalid={raw.length > 0 && !isValidInt}
        />
        <p id="children-help" className="text-caption text-text-muted">
          Whole number from 0 to 20.
        </p>
      </motion.div>
    </OnboardingShell>
  );
}
