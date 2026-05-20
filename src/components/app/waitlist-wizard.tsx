"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ProgressDots } from "@/components/app/progress-dots";

/**
 * WaitlistWizard — onboarding-style wizard chrome for the abridged waitlist
 * flow. Visually matches OnboardingShell (back arrow + bar stepper + big
 * question content + sticky Continue CTA; desktop adds the gradient + Ahavah
 * lockup), but is DECOUPLED from the authed profile store + the 16-step
 * wizard-flow + the onboarding right rail (waitlist users have no account).
 *
 * One question per screen. The parent owns the step machine + answers; this
 * is presentational only.
 */

type Props = {
  /** 1-based current step. */
  step: number;
  /** Total steps (drives the stepper). */
  total: number;
  /** Back handler; omit/undefined disables the back button (first step). */
  onBack?: () => void;
  /** Advance / submit. */
  onNext: () => void;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  children: ReactNode;
};

export function WaitlistWizard({
  step,
  total,
  onBack,
  onNext,
  ctaLabel = "Continue",
  ctaDisabled,
  ctaLoading,
  children,
}: Props) {
  return (
    <div className="relative min-h-dvh md:grid md:grid-cols-[1fr_minmax(auto,640px)_1fr]">
      {/* Desktop left — gradient + lockup (mirrors onboarding) */}
      <div
        className="hidden md:flex md:flex-col md:p-10"
        style={{
          background:
            "linear-gradient(160deg, var(--app), color-mix(in oklch, var(--color-lavender) 16%, var(--app)))",
        }}
      >
        <Logo />
      </div>

      {/* Center column */}
      <div className="flex min-h-dvh flex-col md:min-h-0 md:py-10">
        <div className="flex items-center gap-3 px-5 pt-5 md:px-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={onBack}
            disabled={!onBack}
            className="shrink-0 rounded-full border border-(--hairline) disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <ProgressDots count={total} active={step - 1} mode="bar" tone="lime" className="flex-1" />
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-8 pb-4 md:px-0">
          {children}
        </div>

        <div className="sticky bottom-0 bg-(--app)/90 px-5 py-4 backdrop-blur md:px-0">
          <Button
            tone="cta"
            size="tap"
            className="w-full"
            onClick={onNext}
            disabled={ctaDisabled || ctaLoading}
          >
            {ctaLoading ? "Saving…" : ctaLabel}
          </Button>
        </div>
      </div>

      {/* Desktop right spacer keeps the center column centered */}
      <div className="hidden md:block" />
    </div>
  );
}
