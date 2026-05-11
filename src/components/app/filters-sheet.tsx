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
import {
  ASSEMBLIES,
  TORAH_LEVELS,
  POLYGYNY_VIEWS,
  FEAST_DAYS,
  CALENDARS,
  type Assembly,
  type TorahLevel,
  type Polygyny,
  type FeastDay,
  type Calendar,
  type Intent,
  type HealthTag,
} from "@/lib/profile-schema";
import { POPULAR_COUNTRIES } from "@/lib/countries";

/**
 * Intent filter options — union of male + female intents, deduplicated by value.
 * From the filter perspective, the viewer selects which intents they want to see,
 * regardless of the candidate's gender.
 */
const INTENT_FILTER_OPTIONS: ReadonlyArray<{ value: Intent; label: string }> = [
  { value: "first-wife",              label: "First wife" },
  { value: "additional-wife",         label: "Additional wife" },
  { value: "unmarried-man",           label: "Unmarried man" },
  { value: "married-man",             label: "Married man" },
  { value: "courtship",               label: "Courtship" },
  { value: "marriage-only",           label: "Marriage only" },
  { value: "long-distance-courtship", label: "Long-distance courtship" },
  { value: "open-to-relocation",      label: "Open to relocation" },
  { value: "local-only",              label: "Local only" },
];

/**
 * Health & lifestyle filter options — from profile-schema.
 * Viewer selects which health/lifestyle attributes they want to see.
 */
const HEALTH_TAG_FILTER_OPTIONS: ReadonlyArray<{ value: HealthTag; label: string }> = [
  { value: "non-smoker",      label: "Non-smoker" },
  { value: "no-alcohol",      label: "No alcohol" },
  { value: "moderate-alcohol", label: "Moderate alcohol" },
  { value: "fitness",         label: "Fitness" },
  { value: "natural-health",  label: "Natural health" },
  { value: "herbalist",       label: "Herbalist" },
  { value: "prepper",         label: "Prepper" },
];

/**
 * FiltersSheet — discovery filters, opened from /discover header.
 * Per Phase 6 §6.2 Group B (B4 filters drawer).
 *
 * Composition (kit primitives only):
 *   - shadcn Sheet (bottom side) — drawer container
 *   - shadcn ToggleGroup with variant="pill" — multi-select filter groups
 *   - shadcn Slider — age range (two thumbs)
 *   - shadcn Switch — verified-only premium toggle
 *   - shadcn Button — Apply + Reset CTA
 *   - HTML details/summary — collapsible filter groups (3–8 start collapsed)
 *
 * Filter groups (10 total):
 *   1. Age range — always open, slider 18–80
 *   2. Countries — always open, pill grid from POPULAR_COUNTRIES
 *   3–10. Assemblies, Torah level, Polygyny stance, Intent, Feast days,
 *         Calendars, Health & lifestyle, Verified only — collapsible, hidden by default
 */

export type DiscoverFiltersState = {
  ageMin?: number;
  ageMax?: number;
  countries?: ReadonlyArray<string>;
  assemblies?: ReadonlyArray<Assembly>;
  torahLevels?: ReadonlyArray<TorahLevel>;
  polygynyStances?: ReadonlyArray<Polygyny>;
  intents?: ReadonlyArray<Intent>;
  feastDays?: ReadonlyArray<FeastDay>;
  calendars?: ReadonlyArray<Calendar>;
  healthTags?: ReadonlyArray<HealthTag>;
  verifiedOnly?: boolean;
};

const DEFAULT_FILTERS: DiscoverFiltersState = {
  ageMin: 18,
  ageMax: 80,
  countries: undefined,
  assemblies: undefined,
  torahLevels: undefined,
  polygynyStances: undefined,
  intents: undefined,
  feastDays: undefined,
  calendars: undefined,
  healthTags: undefined,
  verifiedOnly: false,
};

type FiltersSheetProps = {
  /** The element that opens the Sheet — typically the /discover Globe button. */
  trigger: React.ReactElement;
  initialFilters?: Partial<DiscoverFiltersState>;
  onApply?: (filters: DiscoverFiltersState) => void;
};

export function FiltersSheet({
  trigger,
  initialFilters,
  onApply,
}: FiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<DiscoverFiltersState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const update = <K extends keyof DiscoverFiltersState>(
    key: K,
    value: DiscoverFiltersState[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }));


  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleApply = () => {
    // Omit undefined keys before passing to engine
    const payload = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined),
    );
    onApply?.(payload as DiscoverFiltersState);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="bottom"
        className="h-auto max-h-dvh gap-0 rounded-t-3xl border-white/10 bg-bg-indigo p-0"
      >
        <SheetHeader className="flex items-center justify-between px-5 pt-6 pb-2">
          <SheetTitle className="text-h2 text-white">Filters</SheetTitle>
          <button
            onClick={handleReset}
            className="text-meta font-medium text-text-secondary hover:text-white transition-colors"
            aria-label="Reset all filters"
          >
            Reset all
          </button>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {/* 1. Age range — always open, two-thumb slider */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-meta font-medium uppercase text-text-muted">
                Age range
              </h3>
              <span className="text-meta tabular-nums text-text-secondary">
                {filters.ageMin}–{filters.ageMax}
              </span>
            </div>
            <Slider
              value={[filters.ageMin || 18, filters.ageMax || 80]}
              onValueChange={(v) => {
                if (Array.isArray(v)) {
                  update("ageMin", v[0]);
                  update("ageMax", v[1]);
                }
              }}
              min={18}
              max={80}
              step={1}
              minStepsBetweenValues={1}
              aria-label="Age range slider"
            />
          </section>

          {/* 2. Countries — always open, pill grid from POPULAR_COUNTRIES */}
          <section className="flex flex-col gap-3">
            <h3 className="text-meta font-medium uppercase text-text-muted">
              Countries
            </h3>
            <ToggleGroup
              value={filters.countries ? Array.from(filters.countries) : []}
              onValueChange={(v) => {
                update("countries", v.length > 0 ? v : undefined);
              }}
              multiple
              spacing={2}
              width="full"
              aria-label="Select countries"
            >
              {POPULAR_COUNTRIES.map((country) => (
                <ToggleGroupItem
                  key={country.cc}
                  value={country.cc}
                  variant="pill"
                  size="tap"
                  aria-label={`${country.flag} ${country.name}`}
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          {/* 3. Assemblies — collapsible */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-meta font-medium uppercase text-text-muted hover:text-white transition-colors">
              Assemblies
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              <ToggleGroup
                value={filters.assemblies ? Array.from(filters.assemblies) : []}
                onValueChange={(v) => {
                  update(
                    "assemblies",
                    v.length > 0
                      ? (v as ReadonlyArray<Assembly>)
                      : undefined,
                  );
                }}
                multiple
                spacing={2}
                width="full"
                aria-label="Select assemblies"
              >
                {ASSEMBLIES.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    variant="pill"
                    size="tap"
                    aria-label={opt.label}
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </details>

          {/* 4. Torah level — collapsible */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-meta font-medium uppercase text-text-muted hover:text-white transition-colors">
              Torah level
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              <ToggleGroup
                value={filters.torahLevels ? Array.from(filters.torahLevels) : []}
                onValueChange={(v) => {
                  update(
                    "torahLevels",
                    v.length > 0
                      ? (v as ReadonlyArray<TorahLevel>)
                      : undefined,
                  );
                }}
                multiple
                spacing={2}
                width="full"
                aria-label="Select Torah levels"
              >
                {TORAH_LEVELS.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    variant="pill"
                    size="tap"
                    aria-label={opt.label}
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </details>

          {/* 5. Polygyny stances — collapsible */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-meta font-medium uppercase text-text-muted hover:text-white transition-colors">
              Polygyny stance
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              <ToggleGroup
                value={
                  filters.polygynyStances
                    ? Array.from(filters.polygynyStances)
                    : []
                }
                onValueChange={(v) => {
                  update(
                    "polygynyStances",
                    v.length > 0
                      ? (v as ReadonlyArray<Polygyny>)
                      : undefined,
                  );
                }}
                multiple
                spacing={2}
                width="full"
                aria-label="Select polygyny stances"
              >
                {POLYGYNY_VIEWS.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    variant="pill"
                    size="tap"
                    aria-label={opt.label}
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </details>

          {/* 6. Intent — collapsible */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-meta font-medium uppercase text-text-muted hover:text-white transition-colors">
              Intent
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              <p className="text-caption text-text-secondary">
                What kind of relationship the person is looking for
              </p>
              <ToggleGroup
                value={filters.intents ? Array.from(filters.intents) : []}
                onValueChange={(v) => {
                  update(
                    "intents",
                    v.length > 0
                      ? (v as ReadonlyArray<Intent>)
                      : undefined,
                  );
                }}
                multiple
                spacing={2}
                width="full"
                aria-label="Select intents"
              >
                {INTENT_FILTER_OPTIONS.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    variant="pill"
                    size="tap"
                    aria-label={opt.label}
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </details>

          {/* 7. Feast day overlap — collapsible */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-meta font-medium uppercase text-text-muted hover:text-white transition-colors">
              Feast day overlap
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              <p className="text-caption text-text-secondary">
                Show candidates who observe at least one
              </p>
              <ToggleGroup
                value={filters.feastDays ? Array.from(filters.feastDays) : []}
                onValueChange={(v) => {
                  update(
                    "feastDays",
                    v.length > 0
                      ? (v as ReadonlyArray<FeastDay>)
                      : undefined,
                  );
                }}
                multiple
                spacing={2}
                width="full"
                aria-label="Select feast days"
              >
                {FEAST_DAYS.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    variant="pill"
                    size="tap"
                    aria-label={opt.label}
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </details>

          {/* 8. Calendar — collapsible */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-meta font-medium uppercase text-text-muted hover:text-white transition-colors">
              Calendar
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              <ToggleGroup
                value={filters.calendars ? Array.from(filters.calendars) : []}
                onValueChange={(v) => {
                  update(
                    "calendars",
                    v.length > 0
                      ? (v as ReadonlyArray<Calendar>)
                      : undefined,
                  );
                }}
                multiple
                spacing={2}
                width="full"
                aria-label="Select calendars"
              >
                {CALENDARS.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    variant="pill"
                    size="tap"
                    aria-label={opt.label}
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </details>

          {/* 9. Health & lifestyle — collapsible */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-meta font-medium uppercase text-text-muted hover:text-white transition-colors">
              Health & lifestyle
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              <p className="text-caption text-text-secondary">
                Requires the person to claim every tag you pick
              </p>
              <ToggleGroup
                value={filters.healthTags ? Array.from(filters.healthTags) : []}
                onValueChange={(v) => {
                  update(
                    "healthTags",
                    v.length > 0
                      ? (v as ReadonlyArray<HealthTag>)
                      : undefined,
                  );
                }}
                multiple
                spacing={2}
                width="full"
                aria-label="Select health and lifestyle tags"
              >
                {HEALTH_TAG_FILTER_OPTIONS.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    variant="pill"
                    size="tap"
                    aria-label={opt.label}
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </details>

          {/* 10. Verified only — collapsible */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-meta font-medium uppercase text-text-muted hover:text-white transition-colors">
              Verified only
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </summary>
            <div className="flex items-center justify-between pt-3">
              <div className="flex flex-col">
                <p className="text-caption text-text-secondary">
                  Premium feature
                </p>
              </div>
              <Switch
                checked={filters.verifiedOnly || false}
                onCheckedChange={(checked) =>
                  update("verifiedOnly", checked || undefined)
                }
              />
            </div>
          </details>
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
