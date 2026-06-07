"use client";

import { motion } from "motion/react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumberStepper } from "@/components/ui/number-stepper";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";
import { WANTS_CHILDREN, type WantsChildren } from "@/lib/profile-schema";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const MIN_COUNT = 1;
const MAX_COUNT = 20;

export default function ChildrenStep() {
  const { profile, update } = useProfile();

  // Derive the Yes/No "do you have kids" answer from the integer count.
  // 0 → No, ≥1 → Yes, undefined → unanswered. Driving the toggle off the
  // count means a returning user's saved number reproduces the same UI
  // state without a second persisted field.
  const count = profile.children;
  const hasKids: "yes" | "no" | undefined =
    count === undefined ? undefined : count > 0 ? "yes" : "no";
  const wants = profile.wantsChildren;

  const onHasKidsChange = (next: "yes" | "no") => {
    // Yes flips to 1 (lowest valid count); No collapses to 0 and hides
    // the stepper. The user can bump the count up after picking Yes.
    void update({ children: next === "yes" ? 1 : 0 });
  };

  const onCountChange = (next: number) => {
    void update({ children: next });
  };

  const onWantsChange = (next: WantsChildren) => {
    void update({ wantsChildren: next });
  };

  // Both questions must be answered before continuing. If the user picks
  // Yes for "have kids", the stepper defaults to 1 so the count is also
  // valid the moment they pick Yes.
  const isComplete =
    hasKids !== undefined && wants !== undefined && count !== undefined;

  // "more children" reads more naturally once we already know they have
  // at least one. Subtle but recurring source of confusion.
  const wantsHeading =
    hasKids === "yes" ? "Do you want more children?" : "Do you want children?";

  return (
    <OnboardingShell href="/onboarding/children" ctaDisabled={!isComplete}>
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-(--ink)">
          Do you have children<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-(--ink-2)">
          You can change this anytime from your profile.
        </p>
      </motion.div>

      {/* Have-children Yes/No */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-8"
      >
        <RadioGroup
          value={hasKids ?? ""}
          onValueChange={(v) => onHasKidsChange(v as "yes" | "no")}
          aria-label="Do you have children"
          className="grid grid-cols-2 gap-3"
        >
          {(["yes", "no"] as const).map((opt) => {
            const active = opt === hasKids;
            return (
              <Label
                key={opt}
                htmlFor={`has-kids-${opt}`}
                className="block w-full cursor-pointer"
              >
                <Card
                  tone={active ? "flat" : "elevated"}
                  className={cn(
                    "flex flex-row items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-all active:scale-[0.98]",
                    active
                      ? "bg-lime ring-2 ring-inset ring-lime"
                      : "hover:bg-(--card)/80 hover:ring-1 hover:ring-inset hover:ring-border",
                  )}
                >
                  <span
                    className={cn(
                      "text-body font-semibold",
                      active ? "text-black" : "text-(--ink)",
                    )}
                  >
                    {opt === "yes" ? "Yes" : "No"}
                  </span>
                  <RadioGroupItem
                    id={`has-kids-${opt}`}
                    value={opt}
                    variant="brand"
                    className={
                      active
                        ? "border-black data-checked:bg-black data-checked:border-black"
                        : undefined
                    }
                  />
                </Card>
              </Label>
            );
          })}
        </RadioGroup>
      </motion.div>

      {/* Count stepper — only when "Yes". Min 1 (No → 0 is implicit). */}
      {hasKids === "yes" && (
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3 }}
          className="mt-6 flex flex-col items-center gap-2"
        >
          <p className="text-caption text-(--ink-2)">How many?</p>
          <NumberStepper
            value={count && count >= MIN_COUNT ? count : MIN_COUNT}
            onChange={onCountChange}
            min={MIN_COUNT}
            max={MAX_COUNT}
            step={1}
            ariaLabel="Number of children"
          />
        </motion.div>
      )}

      {/* Wants-children Yes / No / Open */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-10"
      >
        <h2 className="text-h2 text-(--ink)">
          {wantsHeading}
        </h2>
        <RadioGroup
          value={wants ?? ""}
          onValueChange={(v) => onWantsChange(v as WantsChildren)}
          aria-label={wantsHeading}
          className="mt-4 grid gap-3"
        >
          {WANTS_CHILDREN.map((opt) => {
            const active = opt.value === wants;
            return (
              <Label
                key={opt.value}
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
            );
          })}
        </RadioGroup>
      </motion.div>
    </OnboardingShell>
  );
}
