"use client";

import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { PageShell } from "@/components/app/page-shell";
import { ProgressDots } from "@/components/app/progress-dots";
import { positionOf } from "@/lib/wizard-flow";

type Props = {
  /**
   * Wizard route (e.g. "/onboarding/name"). When provided, positionOf(href)
   * supplies step / totalSteps / back / next from the canonical
   * wizard-flow.ts map — call sites stop hardcoding these. Individual
   * step / totalSteps / back / next props (below) remain available as
   * overrides for non-wizard consumers, but no production screen uses
   * them anymore.
   */
  href?: string;
  step?: number;
  totalSteps?: number;
  back?: string;
  /** Destination route when CTA is tapped and `onNext` is not provided. */
  next?: string;
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
  href,
  step, totalSteps, back, next,
  ctaLabel = "Continue",
  ctaDisabled, ctaLoading, ctaLoadingLabel = "Verifying…",
  onNext, children, skipHref,
}: Props) {
  // Position resolution: prefer explicit props, fall back to positionOf(href).
  // If neither is provided we fail loud — every onboarding screen should be
  // discoverable in wizard-flow.ts's WIZARD_STEPS.
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

  return (
    // h-screen + overflow-hidden on the shell so the children area scrolls
    // INSIDE the viewport rather than growing the page taller than the
    // viewport. Without this, screens with long lists (e.g. /onboarding/
    // country's 250 rows) push the CTA way below the fold and users have
    // to scroll to advance. The mt-6 + flex-1 children + fixed-height
    // CTA naturally pins the CTA at the viewport bottom.
    <PageShell bottomPad="default" className="h-screen overflow-hidden px-5 pt-5">
      <header className="mb-6 flex items-center justify-between gap-3">
        {resolvedBack ? (
          <Link
            href={resolvedBack}
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
          count={resolvedTotal}
          active={resolvedStep - 1}
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

      {/* min-h-0 unlocks flex-1's overflow behavior so the children area
          scrolls inside the shell rather than growing it. Combined with
          h-screen + overflow-hidden on the shell, this keeps long lists
          (country picker, etc.) inside the viewport while the CTA stays
          pinned below. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>

      {/* CTA — sits below the scrollable area, naturally at viewport bottom.
          -mx-5 px-5 reclaims the shell's gutters so the backdrop spans the
          full width and a subtle gradient masks the scroll-edge above. */}
      <div className="-mx-5 mt-4 bg-linear-to-t from-bg-canvas via-bg-canvas/95 to-transparent px-5 pb-2 pt-4">
        {onNext ? (
          ctaDisabledOrLoading && !ctaLoading ? (
            <Button
              variant="outlineSubtle"
              size="cta"
              className="w-full"
              disabled
              onClick={onNext}
            >
              {renderCtaContent()}
            </Button>
          ) : (
            <Button
              size="cta"
              lift="float"
              className="w-full"
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
              "w-full cursor-not-allowed opacity-90",
            )}
          >
            {renderCtaContent()}
          </span>
        ) : (
          <Link
            href={resolvedNext}
            prefetch={false}
            className={cn(buttonVariants({ size: "cta" }), "w-full")}
          >
            {renderCtaContent()}
          </Link>
        )}
      </div>
    </PageShell>
  );
}
