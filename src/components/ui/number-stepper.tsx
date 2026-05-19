"use client";

import { type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cva } from "class-variance-authority";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const readoutVariants = cva(
  // 2026-05-18: border-white + bg-bg-elevated dark-only → theme-aware tokens
  "flex h-24 w-20 items-center justify-center rounded-2xl border-[3px] border-(--hairline) bg-(--card) shadow-2xl overflow-hidden",
  {
    variants: {
      tone: {
        muted: "text-(--ink-2)",
        active: "text-lime",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

/**
 * Pure clamping helper — exported so unit tests can exercise the math
 * without spinning up React Testing Library (not in the project's
 * test stack as of SP22). Component code below uses the same function
 * so the tested logic is the actual behaviour.
 *
 * Returns the clamped result of `current + delta`, bounded to [min, max].
 */
export function clampStep(
  current: number,
  delta: number,
  min: number,
  max: number,
): number {
  const next = current + delta;
  if (next < min) return min;
  if (next > max) return max;
  return next;
}

export interface NumberStepperProps {
  /** Current value (controlled). */
  value: number;
  /** Called with the clamped next value when the user increments or decrements. */
  onChange: (next: number) => void;
  /** Lower bound (inclusive). Default 0. */
  min?: number;
  /** Upper bound (inclusive). Default 20. */
  max?: number;
  /** Increment/decrement amount. Default 1. */
  step?: number;
  /** aria-label for the group container; describes what's being counted. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Polaroid-style number picker: minus button + readout card + plus button.
 *
 * Aesthetic continues the SP19 /match + SP21 photo-slot sticker-and-paper
 * family — the readout is a paper-framed polaroid with tabular-nums big
 * type that crossfades on change. Buttons are kit-standard 44px circles
 * with active:scale-95 tactile feedback.
 *
 * Controlled component. Parent owns the value via useState / useProfile /
 * etc. and clamps externally-set values; the internal buttons clamp to
 * [min, max] before firing onChange.
 *
 * Keyboard: ArrowLeft / ArrowDown = decrement, ArrowRight / ArrowUp =
 * increment. The number readout has aria-live="polite" so SR users hear
 * each change.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 20,
  step = 1,
  ariaLabel = "Number",
  className,
}: NumberStepperProps) {
  const reduceMotion = useReducedMotion();
  const canDecrement = value > min;
  const canIncrement = value < max;

  const decrement = () => {
    if (canDecrement) onChange(clampStep(value, -step, min, max));
  };
  const increment = () => {
    if (canIncrement) onChange(clampStep(value, step, min, max));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      decrement();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      increment();
    }
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("flex items-center justify-center gap-4", className)}
    >
      <Button
        size="circle-lg"
        tone="elevated"
        aria-label="Decrease"
        disabled={!canDecrement}
        onClick={decrement}
        className="transition-transform active:scale-95"
      >
        <Minus className="size-5 text-lavender" />
      </Button>

      <div className={readoutVariants({ tone: value > 0 ? "active" : "muted" })}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "text-h1 tabular-nums",
              value > 0 ? "font-bold" : "font-medium",
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <Button
        size="circle-lg"
        tone="brand"
        aria-label="Increase"
        disabled={!canIncrement}
        onClick={increment}
        className="transition-transform active:scale-95"
      >
        <Plus className="size-5 text-black" />
      </Button>
    </div>
  );
}
