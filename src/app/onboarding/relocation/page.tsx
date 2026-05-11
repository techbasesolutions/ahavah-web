"use client";

import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";
import { RELOCATIONS, type Relocation } from "@/lib/profile-schema";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function RelocationStep() {
  const { profile, update } = useProfile();
  const selected = profile.relocation ?? "";

  return (
    <OnboardingShell
      step={13}
      totalSteps={14}
      back="/onboarding/assembly"
      next="/onboarding/verification"
      ctaDisabled={!selected}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          How do you feel about relocation<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">
          Helps us match you with people whose openness to moving lines up with yours.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-8"
      >
        <RadioGroup
          value={selected}
          onValueChange={(v) => update({ relocation: v as Relocation })}
          className="grid gap-3"
        >
          {RELOCATIONS.map((opt, i) => {
            const active = opt.value === selected;
            return (
              <motion.div
                key={opt.value}
                {...fadeUp}
                transition={{ duration: 0.35, delay: 0.2 + i * 0.05 }}
              >
                <Label
                  htmlFor={`relocation-${opt.value}`}
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
                      id={`relocation-${opt.value}`}
                      value={opt.value}
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
