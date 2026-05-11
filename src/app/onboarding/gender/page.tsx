"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";

const OPTIONS = [
  { key: "woman", label: "Woman" },
  { key: "man",   label: "Man" },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function GenderStep() {
  // RadioGroup must be controlled-from-first-render to avoid the Base UI
  // "uncontrolled → controlled" warning; using "" keeps the binding consistent
  // while still meaning "no selection" for the CTA-disabled gate.
  const [selected, setSelected] = useState<string>("");

  return (
    <OnboardingShell
      step={5}
      totalSteps={10}
      back="/onboarding/dob"
      next="/onboarding/looking-for"
      ctaDisabled={!selected}
    >
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
