"use client";

import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { PageShell } from "@/components/app/page-shell";
import { ProgressDots } from "@/components/app/progress-dots";

type Props = {
  step: number;
  totalSteps: number;
  back?: string;
  /** Destination route when CTA is tapped and `onNext` is not provided. */
  next: string;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  /** When true, CTA renders Loader2 + ctaLoadingLabel and is disabled. */
  ctaLoading?: boolean;
  /** Override the loading label (default "Verifying…"). */
  ctaLoadingLabel?: string;
  /**
   * If provided, CTA fires this handler instead of navigating to `next`.
   * The handler can navigate manually (e.g. after async work completes).
   * Useful for screens with verification / confirmation steps where the
   * Link semantics aren't enough.
   */
  onNext?: () => void;
  children: ReactNode;
  /** Optional skip link (top-right of header). */
  skipHref?: string;
};

/**
 * Standard onboarding wizard chrome — back arrow + step segments + content +
 * sticky CTA. Used by all /onboarding/* steps.
 *
 * Step indicator uses ProgressDots in bar mode (cumulative fill). The kit
 * doesn't ship a "current-segment-wider" indicator so all reached segments
 * render at equal width.
 *
 * CTA modes:
 *   - default: renders as `<Link href={next}>` (no JS needed)
 *   - `onNext`: renders as `<Button onClick={onNext}>` so screens can hook
 *     async work (verify code, save form) before navigating themselves
 *   - `ctaLoading`: replaces label with Loader2 spinner + ctaLoadingLabel
 *     and disables the button (used during verification / submission)
 */
export function OnboardingShell({
  step, totalSteps, back, next, ctaLabel = "Continue",
  ctaDisabled, ctaLoading, ctaLoadingLabel = "Verifying…",
  onNext, children, skipHref,
}: Props) {
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

  return (
    <PageShell bottomPad="default" className="px-5 pt-5">
      <header className="mb-6 flex items-center justify-between gap-3">
        {back ? (
          <Link
            href={back}
            prefetch={false}
            aria-label="Back"
            className={cn(
              buttonVariants({ size: "icon", variant: "ghost" }),
              "shrink-0 hover:bg-white/5",
            )}
          >
            <ChevronLeft className="text-white" />
          </Link>
        ) : (
          <span className="size-tap shrink-0" />
        )}

        <ProgressDots
          mode="bar"
          tone="lime"
          count={totalSteps}
          active={step - 1}
          className="flex-1"
        />

        {skipHref ? (
          <Link
            href={skipHref}
            prefetch={false}
            className={cn(
              buttonVariants({ variant: "link", size: "sm" }),
              "shrink-0 text-text-secondary",
            )}
          >
            Skip
          </Link>
        ) : (
          <span className="size-tap shrink-0" />
        )}
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      {/* CTA — when disabled, render as outlineSubtle (clearly "not yet
          ready" rather than "broken"). When enabled, lime CTA with float
          lift. Avoids the disabled-opacity-50 olive-grey that previously
          read as a UI bug across all 11 onboarding steps. */}
      {onNext ? (
        ctaDisabledOrLoading && !ctaLoading ? (
          <Button
            variant="outlineSubtle"
            size="cta"
            className="mt-8"
            disabled
            onClick={onNext}
          >
            {renderCtaContent()}
          </Button>
        ) : (
          <Button
            size="cta"
            lift="float"
            className="mt-8"
            disabled={ctaLoading}
            onClick={onNext}
          >
            {renderCtaContent()}
          </Button>
        )
      ) : ctaDisabledOrLoading ? (
        // Disabled-link variant: render as a non-interactive outlineSubtle
        // "button" (a real Link tag with pointer-events-none, but visually
        // matches the outlineSubtle CTA so the disabled state is consistent).
        <span
          aria-disabled
          className={cn(
            buttonVariants({ variant: "outlineSubtle", size: "cta" }),
            "mt-8 cursor-not-allowed opacity-90",
          )}
        >
          {renderCtaContent()}
        </span>
      ) : (
        <Link
          href={next}
          prefetch={false}
          className={cn(buttonVariants({ size: "cta" }), "mt-8")}
        >
          {renderCtaContent()}
        </Link>
      )}
    </PageShell>
  );
}
