"use client";

import Link from "next/link";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { Logo } from "@/components/brand/logo";
import { PageShell } from "@/components/app/page-shell";
import { ProgressDots } from "@/components/app/progress-dots";
import { positionOf } from "@/lib/wizard-flow";

/**
 * OnboardingShell — wizard chrome for all /onboarding/* steps.
 *
 * Mobile (<md): single-column — back arrow + 16-segment stepper + content
 * (scrollable) + sticky Continue CTA. The pre-Task-23 layout.
 *
 * Desktop (md+, 2026-05-17): canonical 3-col grid per
 * screens/03-onboarding.md:
 *   - LEFT (1fr): BrandMark + linear-gradient(app → lavender@16%) bg
 *   - CENTER (720px): stepper row + content + sticky Continue CTA
 *   - RIGHT (1fr): --card bg, "What's next" overline + 7-phase checklist
 *
 * The 7 phases group the 16 steps for the right-rail checklist. Each
 * phase displays "done" when all its constituent steps are done, "current"
 * when the active step lives inside it, and "upcoming" otherwise.
 *
 * Theme-aware throughout. Replaces previous text-white / text-(--ink-2)
 * / variant="outline" usage that rendered invisibly in light mode.
 */

type Props = {
  href?: string;
  step?: number;
  totalSteps?: number;
  back?: string;
  next?: string;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  ctaLoadingLabel?: string;
  onNext?: () => void;
  children: ReactNode;
  skipHref?: string;
};

// 7-phase grouping per canonical screens/03-onboarding.md §RIGHT.
// Step ranges (1-indexed inclusive) map step numbers to phase groups.
const PHASES: ReadonlyArray<{ label: string; firstStep: number; lastStep: number }> = [
  { label: "Name & basics",     firstStep: 1,  lastStep: 4  }, // name/dob/gender/country
  { label: "Photos",            firstStep: 13, lastStep: 13 }, // photos
  { label: "Identity",          firstStep: 14, lastStep: 15 }, // verify-email/phone
  { label: "Faith & doctrine",  firstStep: 9,  lastStep: 10 }, // assembly/polygyny
  { label: "Lifestyle",         firstStep: 5,  lastStep: 8  }, // languages/marital/children/bio
  { label: "Looking for",       firstStep: 11, lastStep: 12 }, // relocation/looking-for
  { label: "Verification",      firstStep: 16, lastStep: 16 }, // complete
];

function phaseStatus(phase: { firstStep: number; lastStep: number }, currentStep: number): "done" | "current" | "upcoming" {
  if (currentStep > phase.lastStep) return "done";
  if (currentStep >= phase.firstStep) return "current";
  return "upcoming";
}

export function OnboardingShell({
  href,
  step, totalSteps, back, next,
  ctaLabel = "Continue",
  ctaDisabled, ctaLoading, ctaLoadingLabel = "Verifying…",
  onNext, children, skipHref,
}: Props) {
  const pos = href ? positionOf(href) : null;
  const resolvedStep = step ?? pos?.step ?? 1;
  const resolvedTotal = totalSteps ?? pos?.totalSteps ?? 1;
  const resolvedBack = back !== undefined ? back : pos?.back ?? undefined;
  const resolvedNext = next ?? pos?.next ?? "/";

  const renderCtaContent = () =>
    ctaLoading ? (
      <>
        <Loader2 className="animate-spin" />
        {ctaLoadingLabel}
      </>
    ) : (
      ctaLabel
    );

  const ctaDisabledOrLoading = ctaDisabled || ctaLoading;

  // ── Stepper row (shared between mobile and desktop) ────────────────────
  const stepperRow = (
    <header className="flex items-center justify-between gap-3">
      {resolvedBack ? (
        <Link
          href={resolvedBack}
          prefetch={false}
          aria-label="Back"
          className={cn(
            buttonVariants({ size: "icon", variant: "ghost" }),
            "shrink-0 rounded-full bg-(--card) border border-(--hairline) text-(--ink) hover:bg-(--app)",
          )}
        >
          <ChevronLeft />
        </Link>
      ) : (
        <span className="size-tap shrink-0" />
      )}

      <ProgressDots
        mode="bar"
        tone="lime"
        count={resolvedTotal}
        active={resolvedStep - 1}
        className="flex-1"
      />

      {/* Step microcopy "N / total" per canonical. Replaces the
          previous Skip link (which lived in this slot). Skip moved
          inline below for screens that need it. */}
      <span
        aria-hidden
        className="shrink-0 text-caption text-(--ink-3) tabular-nums min-w-10 text-right"
      >
        {resolvedStep} / {resolvedTotal}
      </span>
    </header>
  );

  // ── CTA renderer (shared between mobile and desktop) ───────────────────
  const ctaRenderer = (
    <>
      {onNext ? (
        <Button
          size="cta"
          tone="cta"
          lift={ctaDisabledOrLoading ? "none" : "float"}
          className="w-full"
          disabled={ctaDisabledOrLoading}
          onClick={onNext}
        >
          {renderCtaContent()}
        </Button>
      ) : ctaDisabledOrLoading ? (
        <span
          aria-disabled
          className={cn(
            buttonVariants({ variant: "outline", size: "cta" }),
            "w-full cursor-not-allowed opacity-60 border-(--hairline) text-(--ink-2)",
          )}
        >
          {renderCtaContent()}
        </span>
      ) : (
        <Link
          href={resolvedNext}
          prefetch={false}
          className={cn(buttonVariants({ size: "cta", tone: "cta" }), "w-full")}
        >
          {renderCtaContent()}
        </Link>
      )}
      {skipHref ? (
        <Link
          href={skipHref}
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "link", size: "tap" }),
            "mt-2 self-center text-(--ink-2)",
          )}
        >
          Skip
        </Link>
      ) : null}
    </>
  );

  return (
    <PageShell bottomPad="default" desktopShell="full-bleed" className="h-screen overflow-hidden">
      {/* ── Mobile (<md) — single-column wizard chrome ─────────────────── */}
      <div className="md:hidden flex flex-col h-screen px-5 pt-5">
        <div className="mb-6">{stepperRow}</div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
          {children}
        </div>
        <div className="-mx-5 mt-4 px-5 pb-2 pt-4 flex flex-col">
          {ctaRenderer}
        </div>
      </div>

      {/* ── Desktop (md+) — canonical 3-col layout (Task 23, 2026-05-17) — */}
      <div className="hidden md:grid grid-cols-[1fr_720px_1fr] h-screen">
        {/* LEFT: brand mark + linear gradient (app → lavender@16%) */}
        <aside
          className="p-12 flex items-start"
          style={{
            background:
              "linear-gradient(135deg, var(--app) 0%, color-mix(in oklch, var(--color-lavender) 16%, var(--app)) 100%)",
          }}
        >
          <Logo variant="horizontal" size="md" />
        </aside>

        {/* CENTER: stepper + scrollable content + sticky CTA */}
        <div className="px-14 py-12 flex flex-col min-h-0">
          {stepperRow}
          {/* Scrollable content area — paddingBlock 48 per canonical
              "vertical center" of the column. flex-1 + min-h-0 lets it
              scroll if the per-step content overflows.
              `px-1` (4px) gives 4px horizontal breathing room so child
              inputs' focus borders (1.5px) don't collide with the
              implicit overflow-x: hidden boundary that overflow-y-auto
              creates. Without this the lavender focus stroke appeared
              clipped on the input's left edge at desktop. */}
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-8 py-12 overflow-y-auto px-1">
            {children}
          </div>
          <div className="flex flex-col">{ctaRenderer}</div>
        </div>

        {/* RIGHT: "What's next" checklist on --card panel */}
        <aside
          className="p-12 flex flex-col gap-4.5"
          style={{ background: "var(--card)" }}
        >
          <p className="text-overline text-(--ink-2)">What&apos;s next</p>
          {PHASES.map((phase, i) => {
            const status = phaseStatus(phase, resolvedStep);
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
                    done || current
                      ? "text-(--ink) font-medium"
                      : "text-(--ink-2)",
                  )}
                >
                  {phase.label}
                </span>
              </div>
            );
          })}
        </aside>
      </div>
    </PageShell>
  );
}
