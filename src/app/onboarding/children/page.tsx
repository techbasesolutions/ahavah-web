"use client";

import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";
import { WANTS_CHILDREN, type WantsChildren } from "@/lib/profile-schema";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function ChildrenStep() {
  const { profile, update } = useProfile();
  const selected = profile.wantsChildren;
  const isComplete = selected !== undefined;

  return (
    <OnboardingShell href="/onboarding/children" ctaDisabled={!isComplete}>
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-(--ink)">
          Children<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-(--ink-2)">
          You can change this anytime from your profile.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-8"
      >
        <RadioGroup
          value={selected ?? ""}
          onValueChange={(v) => update({ wantsChildren: v as WantsChildren })}
          aria-label="Children preference"
          className="grid gap-3"
        >
          {WANTS_CHILDREN.map((opt, i) => {
            const active = opt.value === selected;
            return (
              <motion.div
                key={opt.value}
                {...fadeUp}
                transition={{ duration: 0.25, delay: 0.06 + i * 0.04 }}
              >
                <Label
                  htmlFor={`wants-${opt.value}`}
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
                        "flex-1 text-body font-semibold",
                        active ? "text-black" : "text-(--ink)",
                      )}
                    >
                      {opt.label}
                    </span>
                    <RadioGroupItem
                      id={`wants-${opt.value}`}
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
