"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * CodeInput — N-box OTP entry per Phase 6 Task 6.1.
 *
 * Each box is a single-character shadcn `Input` (size="lg" tone="elevated").
 * Auto-advances to the next box on input, retreats on Backspace, supports
 * full paste of the code into any box, and exposes the joined value via
 * `onValueChange`.
 *
 * Accessibility:
 *  - Each box gets `aria-label="Digit N of total"`.
 *  - The form-level label/legend is the consumer's responsibility (set
 *    `aria-labelledby` on the surrounding container).
 *  - `inputMode="numeric"` + `autoComplete="one-time-code"` lets iOS /
 *    Android surface SMS-OTP autofill.
 */

type CodeInputProps = {
  length?: number;
  value?: string;
  onValueChange?: (value: string) => void;
  /** Disable all boxes (e.g. while submitting). */
  disabled?: boolean;
  /** Mark all boxes invalid (sets aria-invalid for the destructive ring). */
  invalid?: boolean;
  className?: string;
};

export function CodeInput({
  length = 6,
  value: controlledValue,
  onValueChange,
  disabled,
  invalid,
  className,
}: CodeInputProps) {
  const [internal, setInternal] = React.useState("");
  const value = controlledValue ?? internal;

  const refs = React.useRef<Array<HTMLInputElement | null>>([]);

  const setValue = React.useCallback(
    (next: string) => {
      const cleaned = next.replace(/\D/g, "").slice(0, length);
      if (controlledValue === undefined) setInternal(cleaned);
      onValueChange?.(cleaned);
    },
    [controlledValue, length, onValueChange],
  );

  const handleChange = (i: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    // Paste of full code into any single box → fill all and focus the last.
    if (next.length > 1) {
      setValue(next);
      const last = Math.min(next.replace(/\D/g, "").length, length) - 1;
      if (last >= 0) refs.current[last]?.focus();
      return;
    }
    const digit = next.replace(/\D/g, "");
    const chars = value.split("");
    chars[i] = digit;
    const joined = chars.join("").slice(0, length);
    setValue(joined);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div
      role="group"
      aria-label={`Enter ${length}-digit code`}
      // px-1 keeps the focus ring (3px ring-3 from Input's focus-visible
      // style) from being clipped by the scroll container's overflow-x.
      // OnboardingShell wraps children in overflow-y-auto, which implicitly
      // forces overflow-x: hidden — without this gutter the leftmost box's
      // focus ring chops off at the viewport edge.
      className={cn("flex items-center justify-between gap-2 px-1", className)}
    >
      {Array.from({ length }).map((_, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          size="lg"
          tone="elevated"
          // OTP digit boxes are interactive inputs — they MUST read as
          // tappable squares, not decorative dots. Without a visible
          // edge against bg-indigo, the elevated dark fill blends in.
          //   1. `rounded-xl` (12px) instead of size="lg"'s rounded-2xl
          //      (16px) — squarer corners read as input boxes, not pills
          //   2. `border` + border-white/30 at rest so each box has a
          //      VISIBLE edge against bg-indigo (size="lg" tone="elevated"
          //      is border-0; the `!` important on its bg means we layer
          //      a real border, not a subtle inset shadow)
          //   3. `border-lime` when filled (overrides via twMerge order)
          //      to acknowledge input. Border instead of inset shadow
          //      so the edge has full contrast vs the photo of bg-elevated.
          className={cn(
            // OTP digit boxes need SQUARE corners to read as inputs, not
            // dots. The project's --radius-xl is calc(1rem * 1.4) = 22.4px
            // (much bigger than Tailwind default 12px), so `rounded-xl`
            // here would still look pill-ish. `rounded-md` = 0.8rem = 12.8px
            // — proper square OTP shape.
            // border-white/30 (3.5:1 vs bg-indigo) gives the empty-state
            // edge that border-0 + bg-(--card) otherwise hides.
            "h-tap-xl w-12 rounded-md border border-border px-0 text-center text-h2 font-semibold tabular-nums transition-colors sm:w-14",
            value[i] && "border-lime",
          )}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={handleChange(i)}
          onKeyDown={handleKeyDown(i)}
          onFocus={(e) => e.currentTarget.select()}
        />
      ))}
    </div>
  );
}
