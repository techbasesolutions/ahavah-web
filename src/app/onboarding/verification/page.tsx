"use client";

import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";
import { VERIFICATION_TAGS, type VerificationTag } from "@/lib/profile-schema";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function VerificationStep() {
  const { profile, update } = useProfile();
  const selected = profile.verificationTags ?? [];

  return (
    <OnboardingShell
      href="/onboarding/verification"
      next="/onboarding/complete"
      ctaDisabled={selected.length === 0}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Choose at least one way to verify<span className="text-lime">.</span>
        </h1>
        <p className="text-body text-text-secondary">
          More verifications = more trust + better matches. You can add more
          later from /verify.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-8"
      >
        <ToggleGroup
          multiple
          value={selected}
          onValueChange={(v) =>
            update({ verificationTags: v as VerificationTag[] })
          }
          spacing={2}
          className="flex-wrap"
          aria-label="Verification methods"
        >
          {VERIFICATION_TAGS.map((tag, i) => (
            <motion.div
              key={tag.value}
              {...fadeUp}
              transition={{
                duration: 0.3,
                delay: 0.2 + Math.min(i, 4) * 0.05,
              }}
              className="contents"
            >
              <ToggleGroupItem
                value={tag.value}
                variant="pill"
                size="tap"
                aria-label={tag.label}
                className="gap-2 transition-transform active:scale-95"
              >
                <ShieldCheck className="size-4" aria-hidden />
                {tag.label}
              </ToggleGroupItem>
            </motion.div>
          ))}
        </ToggleGroup>
      </motion.div>
    </OnboardingShell>
  );
}
