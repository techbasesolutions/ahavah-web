"use client";

import { MapPin, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Map-lens status chip (SOT: "Ahavah Map Lens" export, frame 1 + atoms
 * board). Shown on the discover deck ONLY while the lens is actively
 * shaping the order, so the ranking is never a mystery filter.
 *
 * Design decisions transcribed from the export:
 *   - Lavender, not lime: lime means "act on this"; the chip only
 *     explains the current ordering (informational accent).
 *   - Copy never implies exclusion: "Showing people near where you
 *     looked" describes ordering. No "only", no "filtering".
 *   - Dismiss IS the off switch (same store as the sheet toggle, so
 *     the two can never disagree). Pressed state: 20% lavender circle.
 */
export function MapLensChip({
  onDismiss,
  className,
}: {
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-full",
        "border border-lavender/30 bg-lavender/10 pr-1.5 pl-3.5",
        className,
      )}
    >
      <MapPin className="size-4 shrink-0 text-lavender" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-meta font-semibold text-lavender">
        Showing people near where you looked
      </span>
      <button
        type="button"
        aria-label="Turn off map view ordering"
        onClick={onDismiss}
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-lavender",
          "outline-none transition-colors active:bg-lavender/20",
          "focus-visible:ring-2 focus-visible:ring-lavender",
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
