"use client";

import * as React from "react";
import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Choicebox,
  ChoiceboxIndicator,
  ChoiceboxItem,
  ChoiceboxItemHeader,
  ChoiceboxItemSubtitle,
  ChoiceboxItemTitle,
} from "@/components/kibo-ui/choicebox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/lib/use-is-desktop";

/**
 * BlockReportSheet — moderation form opened from a chat thread's kebab menu.
 * Per Phase 6 §6.2 Group C (C5 block/report flow); categories per the
 * standard dating-app moderation taxonomy (Phase 4 Task 4.3 in master plan).
 *
 * UX: pick a category (Kibo Choicebox — symmetric blocks), optionally add
 * details, optionally also block. Submit fires `onSubmit` with the form
 * payload; Sheet closes. The "also block" Switch defaults to ON because
 * users who report typically also want to stop seeing the offender.
 *
 * Composition (kit primitives only):
 *   - shadcn Sheet (bottom side) — drawer container
 *   - Kibo Choicebox + ChoiceboxItem + ChoiceboxIndicator — category picker
 *   - shadcn Textarea — additional details
 *   - shadcn Switch — also-block toggle
 *   - shadcn Button — submit (lavender brand) + cancel (link)
 */

const REPORT_CATEGORIES = [
  {
    value: "inappropriate-photos",
    title: "Inappropriate photos",
    description: "Nudity, sexual content, or violence in profile photos.",
  },
  {
    value: "harassment",
    title: "Harassment or abusive messages",
    description: "Threats, hate speech, or unwanted sexual messages.",
  },
  {
    value: "spam-scam",
    title: "Spam or scam",
    description: "Asking for money, links to other sites, fake profile.",
  },
  {
    value: "underage",
    title: "Underage user",
    description: "Person appears to be under 18.",
  },
  {
    value: "self-harm",
    title: "Self-harm or suicide content",
    description: "Anything suggesting they may be in crisis.",
  },
  {
    value: "other",
    title: "Other",
    description: "Something else that doesn't fit the categories above.",
  },
] as const;

type ReportCategory = (typeof REPORT_CATEGORIES)[number]["value"];

export type BlockReportPayload = {
  category: ReportCategory;
  details: string;
};

type BlockReportSheetProps = {
  /** Controls open state externally (so the kebab Button can trigger it). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display name for headings ("Report {name}"). */
  subjectName: string;
  /**
   * Async handler invoked on submit. Sheet shows a spinner until the
   * promise settles, then closes on success. Callers should perform
   * the actual POST /skip/by-uuid + any post-submit navigation here.
   */
  onSubmit?: (payload: BlockReportPayload) => Promise<void> | void;
};

export function BlockReportSheet({
  open,
  onOpenChange,
  subjectName,
  onSubmit,
}: BlockReportSheetProps) {
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  const handleSubmit = async () => {
    if (!category || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit?.({ category, details });
      // Reset for next open
      setCategory("");
      setDetails("");
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "h-auto max-h-dvh gap-0 border-(--hairline) bg-(--app) p-0",
          isDesktop ? "w-full sm:max-w-md" : "rounded-t-3xl",
        )}
      >
        <SheetHeader className="px-5 pt-6 pb-2">
          <SheetTitle className="text-h2 text-(--ink)">
            Report {subjectName}
          </SheetTitle>
          <SheetDescription className="text-meta text-(--ink-2)">
            Help us keep Ahavah safe. We review every report.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-meta font-medium text-(--ink)">
              What&apos;s the issue?
            </h3>
            <Choicebox
              value={category}
              onValueChange={(v) => setCategory(v as ReportCategory)}
              className="grid gap-3"
            >
              {REPORT_CATEGORIES.map((c) => (
                <ChoiceboxItem
                  key={c.value}
                  value={c.value}
                  id={`report-${c.value}`}
                >
                  <ChoiceboxIndicator variant="brand" />
                  <ChoiceboxItemHeader>
                    <ChoiceboxItemTitle className="text-body text-(--ink)">
                      {c.title}
                    </ChoiceboxItemTitle>
                    <ChoiceboxItemSubtitle className="text-(--ink-3)">
                      {c.description}
                    </ChoiceboxItemSubtitle>
                  </ChoiceboxItemHeader>
                </ChoiceboxItem>
              ))}
            </Choicebox>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-meta font-medium text-(--ink)">
              Additional details (optional)
            </h3>
            <Textarea
              size="lg"
              placeholder="Anything else our moderators should know?"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              className="min-h-24"
            />
            <p className="text-right text-caption tabular-nums text-(--ink-3)">
              {details.length}/500
            </p>
          </section>

          <section className="rounded-xl border border-(--hairline) bg-(--card) px-4 py-3">
            <p className="text-caption text-(--ink-2)">
              Reporting always blocks {subjectName}. You won&apos;t see each
              other&apos;s profiles or messages again.
            </p>
          </section>
        </div>

        <SheetFooter className="gap-2 px-5 pb-6">
          {errorMessage ? (
            <p
              role="alert"
              aria-live="polite"
              className="text-center text-caption font-semibold text-(--color-pink)"
            >
              {errorMessage}
            </p>
          ) : null}
          <Button
            size="cta"
            tone="brand"
            disabled={!category || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit & block"
            )}
          </Button>
          <Button
            variant="link"
            size="sm"
            className="self-center text-(--ink-2) underline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
