"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";
import { positionOf } from "@/lib/wizard-flow";

const OPTIONS = [
  { key: "woman", label: "Woman" },
  { key: "man",   label: "Man" },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function GenderStep() {
  const { profile, update } = useProfile();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Map profile.sex ("female" | "male") to screen display values ("woman" | "man")
  const sexToDisplay = (sex?: string) => {
    if (sex === "female") return "woman";
    if (sex === "male") return "man";
    return "";
  };
  // Map screen selection ("woman" | "man") back to profile.sex ("female" | "male")
  const displayToSex = (display: string) => {
    if (display === "woman") return "female";
    if (display === "man") return "male";
    return undefined;
  };
  const selected = sexToDisplay(profile.sex);

  // Confirmed-save on Continue (2026-07-19, Laura's onboarding loop):
  // the onValueChange PATCH is fire-and-forget, so a single failed
  // save was silent AND never retried — on every later wizard pass the
  // cached selection pre-selects the radio, onValueChange never fires
  // again, and the onboardee reaches /finish-onboarding with
  // gender_id NULL (unrecoverable 409/500 loop). Same class as the
  // 2026-07-08 name/dob fix: Continue advances only after the PATCH
  // confirms, exactly like /onboarding/name.
  const handleNext = async () => {
    const sex = displayToSex(selected);
    if (!sex || saving) return;
    setSaveError(false);
    setSaving(true);
    try {
      await update({ sex });
      router.push(positionOf("/onboarding/gender").next ?? "/onboarding/country");
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell
      href="/onboarding/gender"
      ctaDisabled={!selected}
      ctaLoading={saving}
      ctaLoadingLabel="Saving..."
      onNext={handleNext}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-(--ink)">
          Are you<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-(--ink-2)">You can change this anytime.</p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-8"
      >
        <RadioGroup
          value={selected}
          onValueChange={(v) => {
            const sex = displayToSex(v);
            if (sex) update({ sex });
          }}
          className="grid gap-3"
        >
          {OPTIONS.map((opt, i) => {
            const active = opt.key === selected;
            return (
              <motion.div
                key={opt.key}
                {...fadeUp}
                transition={{ duration: 0.25, delay: 0.06 + Math.min(i, 5) * 0.03 }}
              >
                <Label
                  htmlFor={`gender-${opt.key}`}
                  className="block w-full cursor-pointer"
                >
                  <Card
                    tone={active ? "flat" : "elevated"}
                    className={cn(
                      "flex flex-row items-center gap-3 rounded-2xl px-5 py-4 transition-all active:scale-[0.98]",
                      active
                        ? "bg-lime ring-2 ring-inset ring-lime"
                        : "hover:bg-(--card)/80 hover:ring-1 hover:ring-inset hover:ring-border",
                    )}
                  >
                    <span
                      className={cn(
                        "flex-1 text-body font-medium",
                        active ? "text-black" : "text-(--ink)",
                      )}
                    >
                      {opt.label}
                    </span>
                    <RadioGroupItem
                      id={`gender-${opt.key}`}
                      value={opt.key}
                      variant="brand"
                      aria-label={opt.label}
                      className={
                        active
                          ? "border-black data-checked:bg-black data-checked:border-black"
                          : undefined
                      }
                    />
                  </Card>
                </Label>
              </motion.div>
            );
          })}
        </RadioGroup>
        {saveError ? (
          <p role="alert" aria-live="polite" className="mt-3 text-caption font-semibold text-pink">
            We could not save your answer. Check your connection and tap Continue again.
          </p>
        ) : null}
      </motion.div>
    </OnboardingShell>
  );
}
