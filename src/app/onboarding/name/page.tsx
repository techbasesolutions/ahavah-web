"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";
import { positionOf } from "@/lib/wizard-flow";

const MIN_NAME = 2;
const MAX_NAME = 30;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/**
 * /onboarding/name — first wizard step.
 *
 * 2026-05-17 (Task 23 follow-up): collapsed the previous dual-block layout
 * (bespoke `<DesktopNameCard>` + `md:hidden <OnboardingShell>`) into a
 * single `<OnboardingShell>` mount. The shell now renders BOTH the mobile
 * single-column chrome AND the canonical desktop 3-col layout per
 * screens/03-onboarding.md (1fr gradient panel + 720px center + 1fr
 * What's-next rail). No bespoke desktop component needed — the step just
 * passes its prompt + input as children.
 *
 * Behavioural parity: `useProfile().update` is the same hook as before —
 * the desktop branch wrote through DesktopNameCard's onChange prop, the
 * mobile branch wrote through OnboardingShell's children. Now both paths
 * write directly via `update({ firstName })`.
 */
export default function NameStep() {
  const router = useRouter();
  const { profile, update } = useProfile();
  const name = profile.firstName ?? "";
  const trimmed = name.trim();
  const isValid = trimmed.length >= MIN_NAME && trimmed.length <= MAX_NAME;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // finish-onboarding requires name server-side (NOT NULL on person), so
  // Continue awaits a CONFIRMED write instead of trusting the optimistic
  // per-keystroke PATCH (which can fail silently mid-flow). A failed save
  // surfaces an error and keeps the user here to retry.
  const handleNext = async () => {
    if (!isValid || saving) return;
    setSaveError(false);
    setSaving(true);
    try {
      await update({ firstName: trimmed });
      router.push(positionOf("/onboarding/name").next ?? "/onboarding/dob");
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell
      href="/onboarding/name"
      ctaDisabled={!isValid}
      ctaLoading={saving}
      ctaLoadingLabel="Saving..."
      onNext={handleNext}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display-lg font-extrabold leading-tight tracking-tight text-(--ink)">
          What&apos;s your name<span className="text-(--color-lime)">?</span>
        </h1>
        <p className="text-body text-(--ink-2)">
          This is what people will see.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col gap-2"
      >
        <Label htmlFor="name-input" className="text-meta text-(--ink)">
          First name
        </Label>
        {/* Kit Input primitive — handles border + focus state (1.5px
            lavender on focus per the Task 7 cva audit) internally. NO
            border / bg / text-color overrides here: those fight the
            primitive and caused the previous focus-stroke-clipped-by-
            container bug. h-16 + rounded-[18px] are size+radius
            adjustments to match canonical's 64h / 18 radius spec — they
            stack with the kit's own border/focus rules cleanly. */}
        <Input
          id="name-input"
          autoFocus
          size="lg"
          tone="default"
          value={name}
          onChange={(e) =>
            update({ firstName: e.target.value.slice(0, MAX_NAME) })
          }
          placeholder="e.g. Jessica"
          aria-describedby="name-help"
          aria-invalid={name.length > 0 && !isValid}
          maxLength={MAX_NAME}
          className="h-16 rounded-[18px]"
        />
        <div className="flex items-center justify-between text-caption text-(--ink-3)">
          <span id="name-help">
            Just your first name, change anytime in Settings.
          </span>
          <span className="tabular-nums" aria-hidden>
            {name.length}/{MAX_NAME}
          </span>
        </div>
        {saveError ? (
          <p role="alert" aria-live="polite" className="text-caption font-semibold text-pink">
            We could not save your name. Check your connection and tap Continue again.
          </p>
        ) : null}
      </motion.div>
    </OnboardingShell>
  );
}
