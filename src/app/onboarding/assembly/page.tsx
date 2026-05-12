"use client";

import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";
import { ASSEMBLIES, type Assembly } from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";

import { OnboardingShell } from "@/components/app/onboarding-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function AssemblyStep() {
  const { profile, update } = useProfile();

  return (
    <OnboardingShell href="/onboarding/assembly" ctaDisabled={!profile.assembly}>
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          I identify as<span className="text-lime">…</span>
        </h1>
        <p className="text-body text-text-secondary">
          Used to surface matches who share your faith background. Pick the
          closest fit — you can refine later.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-8"
      >
        <RadioGroup
          value={profile.assembly ?? ""}
          onValueChange={(v) => update({ assembly: v as Assembly })}
          aria-label="Faith identification"
          className="grid gap-3"
        >
          {ASSEMBLIES.map((opt, i) => {
            const active = opt.value === profile.assembly;
            return (
              <motion.div
                key={opt.value}
                {...fadeUp}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.03 }}
              >
                <Label
                  htmlFor={`assembly-${opt.value}`}
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
                      id={`assembly-${opt.value}`}
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
