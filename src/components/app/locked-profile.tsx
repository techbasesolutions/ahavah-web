"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  Heart,
  Lock,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { BlockReportSheet } from "@/components/app/block-report-sheet";
import { cn } from "@/lib/utils";

/**
 * LockedProfile — the truncated view shown for a hidden member
 * (`hide_me_from_strangers`, backend `limited: true`). A real, sparse
 * profile: a locked hero (gradient + initial, NO photo), name, "looking for",
 * a verification trust card, and a redacted teaser of what unlocks on a match.
 * Like / Pass / report are all live; the photo + details stay private until
 * mutual interest. Presentation-only — the page passes formatted strings +
 * the decision/report handlers.
 */
type Props = {
  name: string;
  /** Formatted "looking for" label (e.g. "Marriage"). */
  lookingFor?: string;
  /** Formatted verification labels (e.g. ["Video selfie", "Government ID"]). */
  verifications?: string[];
  backHref: string;
  backLabel: string;
  onLike: () => void;
  onPass: () => void;
  onReportSubmit: (reason: string) => Promise<void> | void;
  likeDisabled?: boolean;
};

// Redacted teaser rows — the blurred bars use fraction-width utilities so no
// per-instance sizing escapes the design scale.
const REDACTED_ROWS: Array<{ k: string; widths: string[] }> = [
  { k: "About", widths: ["w-2/5", "w-1/3"] },
  { k: "Work", widths: ["w-1/2"] },
  { k: "Photos", widths: ["w-1/5"] },
];

export function LockedProfile({
  name,
  lookingFor,
  verifications,
  backHref,
  backLabel,
  onLike,
  onPass,
  onReportSubmit,
  likeDisabled,
}: Props) {
  const [reportOpen, setReportOpen] = React.useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const isVerified = (verifications?.length ?? 0) > 0;

  return (
    <PageShell bottomPad="none" desktopShell="sidebar">
      <div className="mx-auto flex w-full flex-1 flex-col md:max-w-md">
        {/* ── Locked hero: gradient + initial, never a photo ── */}
        <div className="relative h-90 w-full shrink-0 overflow-hidden bg-[linear-gradient(150deg,#1A1340_0%,#5524F5_58%,#7B52F0_100%)]">
          {/* Initial as SVG so the oversized glyph carries no Tailwind font-size. */}
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 size-full select-none"
          >
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="68"
              fontWeight="800"
              fill="rgba(255,255,255,0.15)"
            >
              {initial}
            </text>
          </svg>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,11,31,0.34)_0%,transparent_26%,transparent_58%,rgba(15,11,31,0.55)_100%)]" />

          <div className="absolute top-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-white" />
            <span className="size-1.5 rounded-full bg-white/50" />
            <span className="size-1.5 rounded-full bg-white/50" />
          </div>

          <div className="absolute top-3.5 right-4 left-4 z-10 flex items-center justify-between">
            <Link
              href={backHref}
              prefetch={false}
              aria-label={backLabel}
              className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <button
              type="button"
              aria-label="More options"
              onClick={() => setReportOpen(true)}
              className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>

          <div className="absolute right-4 bottom-11 left-4 z-10">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 text-caption font-bold text-white backdrop-blur">
              <Lock className="size-3.5" />
              Private profile
            </span>
          </div>
        </div>

        {/* ── Sheet ── */}
        <div className="relative z-[5] -mt-7 flex flex-1 flex-col gap-4 rounded-t-2xl bg-(--app) px-5 pt-6 pb-28 shadow-[0_-10px_30px_rgba(15,11,31,0.10)]">
          {/* identity */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-display text-(--ink)">{name}</h1>
              {isVerified ? (
                <p className="mt-2 text-meta font-bold text-(--ink)">
                  Verified member
                </p>
              ) : null}
            </div>
            {lookingFor ? (
              <div className="shrink-0 text-right">
                <div className="text-overline text-(--ink-3)">Looking for</div>
                <div className="mt-1 text-meta font-extrabold tracking-tight text-(--indigo)">
                  {lookingFor}
                </div>
              </div>
            ) : null}
          </div>

          {/* trust card — verified members only */}
          {isVerified ? (
            <div className="rounded-xl border border-(--hairline) bg-(--card) p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-[color-mix(in_oklch,var(--success)_16%,transparent)] text-(--success)">
                  <ShieldCheck className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-meta font-extrabold text-(--ink)">
                    Identity confirmed
                  </div>
                  <div className="text-caption text-(--ink-2)">
                    Every check passed before {name} could match
                  </div>
                </div>
              </div>
              <div className="mt-3.5 flex flex-col">
                {verifications!.map((v, i) => (
                  <div
                    key={v}
                    className={cn(
                      "flex items-center gap-3 py-1.5",
                      i > 0 && "border-t border-(--hairline)",
                    )}
                  >
                    <span className="min-w-0 flex-1 text-meta font-semibold text-(--ink)">
                      {v}
                    </span>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-(--success)">
                      <Check className="size-3 text-black" strokeWidth={3} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* locked teaser */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--lavender)_18%,transparent)] text-(--indigo)">
                <Lock className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="text-body-strong font-extrabold text-(--ink)">
                  The rest unlocks when you match
                </div>
                <div className="mt-0.5 text-meta text-(--ink-2)">
                  {name} keeps photos and details private until there&apos;s
                  mutual interest. Like to start that conversation.
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-(--hairline) bg-[color-mix(in_oklch,var(--lavender)_5%,var(--card))]">
              {REDACTED_ROWS.map((row, i) => (
                <div
                  key={row.k}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5",
                    i > 0 && "border-t border-(--hairline)",
                  )}
                >
                  <span className="w-22 shrink-0 text-meta font-semibold text-(--ink-2)">
                    {row.k}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    {row.widths.map((w, j) => (
                      <span
                        key={j}
                        className={cn(
                          "h-2.5 rounded-md bg-[linear-gradient(90deg,var(--lavender),var(--indigo))] opacity-50 blur-[3px]",
                          w,
                        )}
                      />
                    ))}
                  </span>
                  <Lock className="size-3.5 shrink-0 text-(--ink-3)" />
                </div>
              ))}
              <div className="flex items-center gap-1.5 border-t border-(--hairline) bg-[color-mix(in_oklch,var(--lavender)_9%,transparent)] px-4 py-3 text-caption font-bold text-(--indigo)">
                <Sparkles className="size-3.5 shrink-0" />
                Photos and full profile unlock when you match
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA dock — sticky to the viewport bottom ── */}
      <div className="sticky bottom-0 z-20 mx-auto flex w-full items-center gap-3 bg-[linear-gradient(180deg,transparent_0%,var(--app)_32%)] px-5 pt-4 pb-6 md:max-w-md">
        <button
          type="button"
          aria-label="Pass"
          onClick={onPass}
          disabled={likeDisabled}
          className="flex size-15 shrink-0 items-center justify-center rounded-full border border-(--border) bg-(--card) text-(--ink-2) shadow-[var(--shadow-soft)] disabled:opacity-50"
        >
          <X className="size-6" />
        </button>
        <button
          type="button"
          onClick={onLike}
          disabled={likeDisabled}
          className="flex h-15 flex-1 items-center justify-center gap-2.5 rounded-xl bg-(--pink) text-body font-extrabold tracking-tight text-white shadow-[0_12px_28px_-8px_color-mix(in_oklch,var(--pink)_60%,transparent)] disabled:opacity-50"
        >
          <Heart className="size-5.5" fill="currentColor" />
          Like {name}
        </button>
      </div>

      <BlockReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        subjectName={name}
        onSubmit={async (payload) => {
          const reason = payload.details
            ? `${payload.category}: ${payload.details}`
            : payload.category;
          await onReportSubmit(reason);
        }}
      />
    </PageShell>
  );
}
