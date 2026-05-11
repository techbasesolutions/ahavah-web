"use client";

import * as React from "react";
import { useState } from "react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
  alsoBlock: boolean;
};

type BlockReportSheetProps = {
  /** Controls open state externally (so the kebab Button can trigger it). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display name for headings ("Report {name}"). */
  subjectName: string;
  /** Fired when user submits a valid report. */
  onSubmit?: (payload: BlockReportPayload) => void;
};

export function BlockReportSheet({
  open,
  onOpenChange,
  subjectName,
  onSubmit,
}: BlockReportSheetProps) {
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);

  const handleSubmit = () => {
    if (!category) return;
    onSubmit?.({ category, details, alsoBlock });
    // Reset for next open
    setCategory("");
    setDetails("");
    setAlsoBlock(true);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-dvh gap-0 rounded-t-3xl border-white/10 bg-bg-indigo p-0"
      >
        <SheetHeader className="px-5 pt-6 pb-2">
          <SheetTitle className="text-h2 text-white">
            Report {subjectName}
          </SheetTitle>
          <SheetDescription className="text-meta text-text-secondary">
            Help us keep Ahavah safe. We review every report.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-4">
          {/* Category picker — Kibo Choicebox with brand radio variant */}
          <section className="flex flex-col gap-2">
            <h3 className="text-meta font-medium text-white">
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
                    <ChoiceboxItemTitle className="text-body text-white">
                      {c.title}
                    </ChoiceboxItemTitle>
                    <ChoiceboxItemSubtitle className="text-text-muted">
                      {c.description}
                    </ChoiceboxItemSubtitle>
                  </ChoiceboxItemHeader>
                </ChoiceboxItem>
              ))}
            </Choicebox>
          </section>

          {/* Optional details */}
          <section className="flex flex-col gap-2">
            <h3 className="text-meta font-medium text-white">
              Additional details (optional)
            </h3>
            <Textarea
              size="lg"
              tone="elevated"
              placeholder="Anything else our moderators should know?"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              className="min-h-24"
            />
            <p className="text-right text-caption tabular-nums text-text-muted">
              {details.length}/500
            </p>
          </section>

          {/* Also-block toggle */}
          <section className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h3 className="text-meta font-medium text-white">
                Also block {subjectName}
              </h3>
              <p className="text-caption text-text-secondary">
                You won&apos;t see each other&apos;s profiles or messages again.
              </p>
            </div>
            <Switch checked={alsoBlock} onCheckedChange={setAlsoBlock} />
          </section>
        </div>

        <SheetFooter className="gap-2 px-5 pb-6">
          <Button
            size="cta"
            tone="brand"
            disabled={!category}
            onClick={handleSubmit}
          >
            {alsoBlock ? "Submit & block" : "Submit report"}
          </Button>
          <Button
            variant="link"
            size="sm"
            className="self-center text-text-secondary underline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
