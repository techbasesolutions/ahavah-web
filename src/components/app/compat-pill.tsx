"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Pill } from "@/components/kibo-ui/pill";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import type { CompatibilityBreakdown } from "@/lib/scoring/compute-compatibility";
import { cn } from "@/lib/utils";

export interface CompatPillProps {
  score: number;
  breakdown?: CompatibilityBreakdown;
  /**
   * Maps directly to Pill's cva size. "sm" for in-card overlays (discover
   * caption, profile-photo chip); "default" for standalone status pills
   * elsewhere. Padding + text size live in the Pill primitive — no
   * className overrides here (was the kit-only violation fixed in 044f033).
   */
  size?: "sm" | "default";
  className?: string;
}

function getVariant(score: number): "lime" | "lavender" | "pink" {
  if (score >= 85) return "lime";
  if (score >= 65) return "lavender";
  return "pink";
}

const AXIS_LABELS: Record<keyof CompatibilityBreakdown, string> = {
  calendar: "Calendar",
  polygyny: "Polygyny",
  family: "Family",
  relocation: "Relocation",
  lifestyle: "Lifestyle",
  communication: "Communication",
  observance: "Observance",
  feast: "Feast Days",
  language: "Language",
};

export function CompatPill({
  score,
  breakdown,
  size = "default",
  className,
}: CompatPillProps) {
  const [open, setOpen] = useState(false);
  const variant = getVariant(score);

  const pillContent = (
    <div className="flex items-center gap-1.5">
      <Sparkles className={cn("text-current", size === "sm" ? "size-3" : "size-4")} />
      <span className="font-bold tabular-nums">{score}%</span>
    </div>
  );

  if (!breakdown) {
    return (
      <Pill variant={variant} size={size} className={className}>
        {pillContent}
      </Pill>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Interactive trigger needs a 44px tap target (R-Phase-D / §20 audit
          finding); the visible Pill stays size="sm"/"default" so its visual
          density is unchanged. The trigger is a transparent inline-flex
          centerer with min-h-tap min-w-tap so the touch surface extends
          beyond the chip bounds without affecting layout. */}
      <SheetTrigger
        aria-label="Show compatibility breakdown"
        className="inline-flex min-h-tap min-w-tap cursor-pointer items-center justify-center border-none bg-transparent p-0"
      >
        <Pill variant={variant} size={size} className={className}>
          {pillContent}
        </Pill>
      </SheetTrigger>
      <SheetContent side="bottom" showCloseButton>
        <SheetHeader>
          <SheetTitle>Compatibility Breakdown</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {(Object.entries(breakdown) as Array<[keyof CompatibilityBreakdown, number]>).map(
            ([axis, value]) => (
              <div key={axis} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-primary font-medium">
                    {AXIS_LABELS[axis]}
                  </span>
                  <span className="text-(--ink-2) text-xs tabular-nums">
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <Progress value={value * 100} className="h-2" />
              </div>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
