"use client";

import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";

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

  return (
    <OnboardingShell href="/onboarding/gender" ctaDisabled={!selected}>
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Which best describes you<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">You can change this anytime.</p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
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
                transition={{ duration: 0.35, delay: 0.2 + i * 0.05 }}
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
                        : "hover:bg-bg-elevated/80 hover:ring-1 hover:ring-inset hover:ring-white/10",
                    )}
                  >
                    <span
                      className={cn(
                        "flex-1 text-body font-medium",
                        active ? "text-black" : "text-white",
                      )}
                    >
                      {opt.label}
                    </span>
                    <RadioGroupItem
                      id={`gender-${opt.key}`}
                      value={opt.key}
                      variant="brand"
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
      </motion.div>
    </OnboardingShell>
  );
}
