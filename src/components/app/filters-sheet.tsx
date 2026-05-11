"use client";

import * as React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * FiltersSheet — discovery filters, opened from /discover header.
 * Per Phase 6 §6.2 Group B (B4 filters drawer).
 *
 * Composition (kit primitives only):
 *   - shadcn Sheet (bottom side) — drawer container
 *   - shadcn ToggleGroup with brand variant — Looking-for + Show-me pills
 *   - shadcn Slider — distance (single) + age (range, two thumbs)
 *   - shadcn Switch — verified-only premium toggle
 *   - shadcn Button — Apply CTA (lavender per Dateasy "modify-settings" rule)
 */

const LOOKING_FOR_OPTIONS = [
  { value: "relationship", label: "Relationship" },
  { value: "friendship",   label: "Friendship" },
];

// Gender selection is binary across the app per product decision
// (memory/feedback_ahavah_gender_binary.md). "All" was dropped since it's
// no longer meaningful with two options.
const SHOW_ME_OPTIONS = [
  { value: "women", label: "Women" },
  { value: "men",   label: "Men" },
];

export type FilterState = {
  lookingFor: string;
  showMe: string;
  ageRange: [number, number];
  maxDistance: number;
  verifiedOnly: boolean;
};

const DEFAULT_FILTERS: FilterState = {
  lookingFor: "relationship",
  showMe: "women",
  ageRange: [18, 30],
  maxDistance: 50,
  verifiedOnly: false,
};

type FiltersSheetProps = {
  /** The element that opens the Sheet — typically the /discover Globe button. */
  trigger: React.ReactElement;
  initialFilters?: Partial<FilterState>;
  onApply?: (filters: FilterState) => void;
};

export function FiltersSheet({
  trigger,
  initialFilters,
  onApply,
}: FiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => {
    onApply?.(filters);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="bottom"
        className="h-auto max-h-dvh gap-0 rounded-t-3xl border-white/10 bg-bg-indigo p-0"
      >
        <SheetHeader className="px-5 pt-6 pb-2">
          <SheetTitle className="text-h2 text-white">Filters</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-4">
          {/* Looking for */}
          <section className="flex flex-col gap-3">
            <h3 className="text-meta font-medium text-white">Looking for</h3>
            <ToggleGroup
              value={[filters.lookingFor]}
              onValueChange={(v) => v[0] && update("lookingFor", v[0])}
              spacing={2}
              width="full"
            >
              {LOOKING_FOR_OPTIONS.map((o) => (
                <ToggleGroupItem
                  key={o.value}
                  value={o.value}
                  variant="pill"
                  size="tap"
                  aria-label={o.label}
                >
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          {/* Show me */}
          <section className="flex flex-col gap-3">
            <h3 className="text-meta font-medium text-white">Show me</h3>
            <ToggleGroup
              value={[filters.showMe]}
              onValueChange={(v) => v[0] && update("showMe", v[0])}
              spacing={2}
              width="full"
            >
              {SHOW_ME_OPTIONS.map((o) => (
                <ToggleGroupItem
                  key={o.value}
                  value={o.value}
                  variant="pill"
                  size="tap"
                  aria-label={o.label}
                >
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          {/* Age range — shadcn Slider supports range via 2-element value array */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-meta font-medium text-white">Preferred age</h3>
              <span className="text-meta tabular-nums text-text-secondary">
                {filters.ageRange[0]}–{filters.ageRange[1]}
              </span>
            </div>
            <Slider
              value={filters.ageRange}
              onValueChange={(v) => {
                // Base UI Slider's value type is `number | readonly number[]`
                // (single + range share one signature). Range mode always
                // returns an array — narrow before reading both thumbs.
                if (Array.isArray(v)) {
                  update("ageRange", [v[0], v[1]] as [number, number]);
                }
              }}
              min={18}
              max={80}
              step={1}
              minStepsBetweenValues={1}
            />
          </section>

          {/* Distance — single thumb */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-meta font-medium text-white">
                Preferred distance
              </h3>
              <span className="text-meta tabular-nums text-text-secondary">
                {filters.maxDistance} km
              </span>
            </div>
            <Slider
              value={[filters.maxDistance]}
              onValueChange={(v) => {
                // Single-thumb slider — Base UI's value type is
                // `number | readonly number[]`; coerce to array form
                // and read the first (only) thumb.
                const arr = Array.isArray(v) ? v : [v];
                update("maxDistance", arr[0]);
              }}
              min={1}
              max={500}
              step={1}
            />
          </section>

          {/* Verified-only */}
          <section className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h3 className="text-meta font-medium text-white">Verified only</h3>
              <p className="text-caption text-text-secondary">
                Premium feature
              </p>
            </div>
            <Switch
              checked={filters.verifiedOnly}
              onCheckedChange={(checked) => update("verifiedOnly", checked)}
            />
          </section>
        </div>

        <SheetFooter className="px-5 pb-6">
          <Button size="cta" tone="brand" onClick={handleApply}>
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
