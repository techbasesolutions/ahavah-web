"use client";

import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/use-profile";
import { POLYGYNY_VIEWS, type Polygyny } from "@/lib/profile-schema";

import { OnboardingShell } from "@/components/app/onboarding-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function PolygynyStep() {
  const { profile, update } = useProfile();

  return (
    <OnboardingShell
      href="/onboarding/polygyny"
      skipHref="/onboarding/assembly"
      ctaDisabled={!profile.polygyny}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Your view on biblical polygyny<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">
          We ask up front so matches reflect your stance. You can change this anytime.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-8"
      >
        <RadioGroup
          value={profile.polygyny ?? ""}
          onValueChange={(v) => update({ polygyny: v as Polygyny })}
          aria-label="Your view on biblical polygyny"
          className="grid gap-3"
        >
          {POLYGYNY_VIEWS.map((opt, i) => {
            const active = opt.value === profile.polygyny;
            return (
              <motion.div
                key={opt.value}
                {...fadeUp}
                transition={{ duration: 0.25, delay: 0.06 + Math.min(i, 5) * 0.03 }}
              >
                <Label
                  htmlFor={`polygyny-${opt.value}`}
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
                      id={`polygyny-${opt.value}`}
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
