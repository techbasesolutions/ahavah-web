"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";

// Per duolicious-audit Q4: dating-app intent funnels into 4 buckets. Drives
// match weighting + (eventually) "show only people seeking the same thing".
const OPTIONS = [
  { key: "relationship", title: "Long-term relationship", body: "Looking for something serious" },
  { key: "dating",       title: "Casual dating",          body: "See where things go" },
  { key: "friendship",   title: "Friendship",             body: "Meet new people, no pressure" },
  { key: "open",         title: "Open to anything",       body: "Whatever feels right" },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function LookingForStep() {
  // Controlled-from-first-render to avoid the Base UI "uncontrolled →
  // controlled" warning that fires when value flips from undefined → string
  // on first selection (matches Task 8 fix in /onboarding/gender).
  const [selected, setSelected] = useState<string>("");

  return (
    <OnboardingShell
      step={6}
      totalSteps={10}
      back="/onboarding/gender"
      next="/onboarding/photos"
      ctaDisabled={!selected}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          What are you looking for<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">
          You can change this anytime in Discovery preferences.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-8"
      >
        <RadioGroup
          value={selected}
          onValueChange={(v) => setSelected(v as string)}
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
                  htmlFor={`looking-${opt.key}`}
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
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span
                        className={cn(
                          "text-body font-semibold",
                          active ? "text-black" : "text-white",
                        )}
                      >
                        {opt.title}
                      </span>
                      <span
                        className={cn(
                          "text-meta",
                          active ? "text-black/70" : "text-text-secondary",
                        )}
                      >
                        {opt.body}
                      </span>
                    </div>
                    <RadioGroupItem
                      id={`looking-${opt.key}`}
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
