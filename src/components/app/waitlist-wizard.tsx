"use client";

import type { ReactNode } from "react";
import { Check, ChevronLeft } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { PageShell } from "@/components/app/page-shell";
import { ProgressDots } from "@/components/app/progress-dots";

/**
 * WaitlistWizard — wizard chrome for the abridged waitlist flow.
 *
 * Faithfully replicates OnboardingShell's structure (PageShell full-bleed +
 * h-dvh; mobile single-column; desktop 3-col [1fr,720px,1fr] with the
 * gradient + Ahavah lockup left, stepper + content + sticky CTA center, and a
 * "What's next" phase checklist right). The ONLY departures: navigation is
 * in-page (back = onClick, CTA = onClick) rather than route Links, and the
 * right-rail phases are the waitlist's own — because waitlist users have no
 * account, so OnboardingShell's useProfile/wizard-flow/onboarding-phase
 * coupling can't be reused directly.
 */

export type WaitlistPhase = { label: string; firstStep: number; lastStep: number };

function phaseStatus(
  phase: WaitlistPhase,
  currentStep: number,
): "done" | "current" | "upcoming" {
  if (currentStep > phase.lastStep) return "done";
  if (currentStep >= phase.firstStep) return "current";
  return "upcoming";
}

type Props = {
  /** 1-based current step. */
  step: number;
  /** Total steps (drives the bar stepper + "N / total"). */
  total: number;
  /** Phase groups for the desktop right-rail checklist. */
  phases: ReadonlyArray<WaitlistPhase>;
  /** Back handler; omit on the first step to disable the control. */
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
  phases,
  onBack,
  onNext,
  ctaLabel = "Continue",
  ctaDisabled,
  ctaLoading,
  children,
}: Props) {
  const disabled = ctaDisabled || ctaLoading;

  const stepperRow = (
    <header className="flex items-center justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={cn(
            buttonVariants({ size: "icon", variant: "ghost" }),
            "shrink-0 rounded-full bg-(--card) border border-(--hairline) text-(--ink) hover:bg-(--app)",
          )}
        >
          <ChevronLeft />
        </button>
      ) : (
        <span className="size-tap shrink-0" />
      )}

      <ProgressDots mode="bar" tone="lime" count={total} active={step - 1} className="flex-1" />

      <span
        aria-hidden
        className="shrink-0 text-caption text-(--ink-3) tabular-nums min-w-10 text-right"
      >
        {step} / {total}
      </span>
    </header>
  );

  const ctaRenderer = (
    <Button
      size="cta"
      tone="cta"
      lift={disabled ? "none" : "float"}
      className="w-full"
      disabled={disabled}
      onClick={onNext}
    >
      {ctaLoading ? "Saving…" : ctaLabel}
    </Button>
  );

  const rail = (
    <>
      <p className="text-overline text-(--ink-2)">What&apos;s next</p>
      {phases.map((phase, i) => {
        const status = phaseStatus(phase, step);
        const done = status === "done";
        const current = status === "current";
        return (
          <div key={phase.label} className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-caption font-extrabold tabular-nums",
                done
                  ? "bg-(--color-lime) text-black"
                  : current
                    ? "bg-(--color-lavender)/14 text-(--color-lavender)"
                    : "bg-(--hairline) text-(--ink-3)",
              )}
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "text-meta",
                current ? "text-(--ink) font-semibold" : done ? "text-(--ink-2)" : "text-(--ink-3)",
              )}
            >
              {phase.label}
            </span>
          </div>
        );
      })}
    </>
  );

  return (
    <PageShell bottomPad="none" desktopShell="full-bleed" className="h-dvh overflow-hidden">
      {/* Mobile (<md) — single-column wizard chrome */}
      <div className="md:hidden flex flex-col h-dvh px-5 pt-5">
        <div className="mb-6">{stepperRow}</div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1">{children}</div>
        <div className="-mx-5 mt-4 px-5 pb-2 pt-4 flex flex-col">{ctaRenderer}</div>
      </div>

      {/* Desktop (md+) — canonical 3-col layout */}
      <div className="hidden md:grid grid-cols-[1fr_720px_1fr] grid-rows-[1fr] h-dvh">
        <aside
          className="p-12 flex items-start"
          style={{
            background:
              "linear-gradient(135deg, var(--app) 0%, color-mix(in oklch, var(--color-lavender) 16%, var(--app)) 100%)",
          }}
        >
          <Logo variant="horizontal" size="md" />
        </aside>

        <div className="px-14 py-12 flex flex-col min-h-0">
          {stepperRow}
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-8 py-12 overflow-y-auto px-1">
            {children}
          </div>
          <div className="flex flex-col">{ctaRenderer}</div>
        </div>

        <aside className="p-12 flex flex-col gap-4.5" style={{ background: "var(--card)" }}>
          {rail}
        </aside>
      </div>
    </PageShell>
  );
}
