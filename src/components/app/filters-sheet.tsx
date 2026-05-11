"use client";

import * as React from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { cn } from "@/lib/utils";

import {
  ASSEMBLIES,
  CALENDARS,
  EDUCATIONS,
  POLYGYNY_VIEWS,
  TORAH_LEVELS,
  type Assembly,
  type Calendar,
  type EducationLevel,
  type HealthTag,
  type Intent,
  type Polygyny,
  type TorahLevel,
} from "@/lib/profile-schema";

/**
 * FiltersSheet — discovery filters drawer.
 *
 * Design rules (mobile-first, 414×896 baseline):
 * - Token-only colors (lime / lavender / pink / bg-* / text-*).
 * - 8px spacing grid (gap-2 / gap-3 / gap-4).
 * - 44×44 touch targets via ToggleGroupItem size="tap".
 * - Typography: text-h2 (header) / text-meta uppercase (group label) /
 *   text-caption text-text-muted (helper).
 * - Pill grids WRAP — `flex-wrap` so labels never overflow. The
 *   underlying ToggleGroup primitive is flex-row by default, so we
 *   override via className. No `width="full"` (which would force
 *   equal widths — wrong for variable-length labels).
 * - Apply / Reset land in a sticky footer so they're always reachable
 *   on a long filter list.
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

const HEALTH_TAG_FILTER_OPTIONS: ReadonlyArray<{ value: HealthTag; label: string }> = [
  { value: "non-smoker",       label: "Non-smoker" },
  { value: "no-alcohol",       label: "No alcohol" },
  { value: "moderate-alcohol", label: "Moderate alcohol" },
  { value: "fitness",          label: "Fitness" },
  { value: "natural-health",   label: "Natural health" },
  { value: "herbalist",        label: "Herbalist" },
  { value: "prepper",          label: "Prepper" },
];

export type DiscoverFiltersState = {
  ageMin?: number;
  ageMax?: number;
  assemblies?: ReadonlyArray<Assembly>;
  torahLevels?: ReadonlyArray<TorahLevel>;
  polygynyStances?: ReadonlyArray<Polygyny>;
  intents?: ReadonlyArray<Intent>;
  calendars?: ReadonlyArray<Calendar>;
  healthTags?: ReadonlyArray<HealthTag>;
  educations?: ReadonlyArray<EducationLevel>;
  verifiedOnly?: boolean;
};

const DEFAULT_FILTERS: DiscoverFiltersState = {
  ageMin: 18,
  ageMax: 80,
  verifiedOnly: false,
};

// --- Helpers ----------------------------------------------------------------

type PillOption<T extends string> = { value: T; label: string; flag?: string };

/**
 * Multi-select pill grid with flex-wrap. Single helper so every filter
 * group has identical layout + accessibility behaviour.
 */
function PillGrid<T extends string>({
  ariaLabel,
  options,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  options: ReadonlyArray<PillOption<T>>;
  value: ReadonlyArray<T>;
  onValueChange: (next: T[]) => void;
}) {
  return (
    <ToggleGroup
      multiple
      value={[...value]}
      onValueChange={(v) => onValueChange(v as T[])}
      spacing={2}
      className="flex-wrap"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          variant="pill"
          size="tap"
          aria-label={opt.flag ? `${opt.flag} ${opt.label}` : opt.label}
        >
          {opt.flag ? <span aria-hidden>{opt.flag}</span> : null}
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * Collapsible filter section. Uses native details/summary so SR-friendly
 * by default; we style the summary as a tappable row with a chevron.
 */
function FilterSection({
  label,
  description,
  defaultOpen,
  children,
}: {
  label: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group border-b border-white/5 last:border-b-0"
      open={defaultOpen}
    >
      <summary
        className={cn(
          "flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 py-3",
          "text-meta font-semibold uppercase tracking-wide text-text-secondary",
          "transition-colors hover:text-white",
          // Strip default disclosure triangle in webkit/firefox
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span>{label}</span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3 pb-4">
        {description ? (
          <p className="text-caption text-text-muted">{description}</p>
        ) : null}
        {children}
      </div>
    </details>
  );
}

// --- Main component ---------------------------------------------------------

type FiltersSheetProps = {
  trigger: React.ReactElement;
  initialFilters?: Partial<DiscoverFiltersState>;
  onApply?: (filters: DiscoverFiltersState) => void;
};

export function FiltersSheet({ trigger, initialFilters, onApply }: FiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<DiscoverFiltersState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const update = <K extends keyof DiscoverFiltersState>(
    key: K,
    value: DiscoverFiltersState[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }));

  const handleReset = () => setFilters(DEFAULT_FILTERS);

  const handleApply = () => {
    const payload = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => {
        if (v === undefined) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      }),
    ) as DiscoverFiltersState;
    onApply?.(payload);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="bottom"
        className="flex max-h-dvh flex-col gap-0 rounded-t-3xl border-white/10 bg-bg-indigo p-0"
      >
        {/* Header — title only. The SheetContent kit primitive auto-renders
            a close X at absolute top-3 right-3; placing 'Reset all' here
            collided visually with that X. Reset moved to the footer
            (secondary action next to Apply filters) to keep the top
            chrome clean. */}
        <SheetHeader className="items-center px-5 pt-6 pb-3">
          <SheetTitle className="text-h2 text-white">Filters</SheetTitle>
        </SheetHeader>

        {/* Scrollable body — every group on its own 8px-grid section. */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 pb-4">
          {/* 1. Age range — always visible, no collapse. */}
          <section className="flex flex-col gap-3 border-b border-white/5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-meta font-semibold uppercase tracking-wide text-text-secondary">
                Age range
              </h3>
              <span className="text-meta tabular-nums text-white">
                {filters.ageMin}–{filters.ageMax}
              </span>
            </div>
            <Slider
              value={[filters.ageMin ?? 18, filters.ageMax ?? 80]}
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
              aria-label="Age range"
            />
          </section>

          {/* Country filter intentionally omitted. A fixed pill list of
              POPULAR_COUNTRIES doesn't match the app's intended Bumpy-style
              map-zoom-driven location filtering. Real location filtering
              will arrive with the map view + profile.lat/lng. */}

          <FilterSection label="I identify as" defaultOpen>
            <PillGrid
              ariaLabel="Filter by assemblies"
              options={ASSEMBLIES}
              value={filters.assemblies ?? []}
              onValueChange={(v) =>
                update("assemblies", v.length > 0 ? (v as Assembly[]) : undefined)
              }
            />
          </FilterSection>

          <FilterSection label="Torah observance stage">
            <PillGrid
              ariaLabel="Filter by Torah observance stage"
              options={TORAH_LEVELS}
              value={filters.torahLevels ?? []}
              onValueChange={(v) =>
                update("torahLevels", v.length > 0 ? (v as TorahLevel[]) : undefined)
              }
            />
          </FilterSection>

          <FilterSection label="Polygyny stance">
            <PillGrid
              ariaLabel="Filter by polygyny stance"
              options={POLYGYNY_VIEWS}
              value={filters.polygynyStances ?? []}
              onValueChange={(v) =>
                update("polygynyStances", v.length > 0 ? (v as Polygyny[]) : undefined)
              }
            />
          </FilterSection>

          <FilterSection
            label="Intent"
            description="What kind of relationship they're looking for."
          >
            <PillGrid
              ariaLabel="Filter by intent"
              options={INTENT_FILTER_OPTIONS}
              value={filters.intents ?? []}
              onValueChange={(v) =>
                update("intents", v.length > 0 ? (v as Intent[]) : undefined)
              }
            />
          </FilterSection>

          <FilterSection label="Calendar">
            <PillGrid
              ariaLabel="Filter by calendar"
              options={CALENDARS}
              value={filters.calendars ?? []}
              onValueChange={(v) =>
                update("calendars", v.length > 0 ? (v as Calendar[]) : undefined)
              }
            />
          </FilterSection>

          <FilterSection label="Education">
            <PillGrid
              ariaLabel="Filter by education level"
              options={EDUCATIONS}
              value={filters.educations ?? []}
              onValueChange={(v) =>
                update("educations", v.length > 0 ? (v as EducationLevel[]) : undefined)
              }
            />
          </FilterSection>

          <FilterSection
            label="Health & lifestyle"
            description="Candidate must claim every tag you pick."
          >
            <PillGrid
              ariaLabel="Filter by health & lifestyle"
              options={HEALTH_TAG_FILTER_OPTIONS}
              value={filters.healthTags ?? []}
              onValueChange={(v) =>
                update("healthTags", v.length > 0 ? (v as HealthTag[]) : undefined)
              }
            />
          </FilterSection>

          {/* Verified only — single switch row, not a pill group. */}
          <section className="flex items-center justify-between gap-3 border-b border-white/5 py-4 last:border-b-0">
            <div className="flex flex-col gap-1">
              <h3 className="text-meta font-semibold uppercase tracking-wide text-text-secondary">
                Verified only
              </h3>
              <p className="text-caption text-text-muted">
                Only show profiles with at least one verification.
              </p>
            </div>
            <Switch
              checked={filters.verifiedOnly ?? false}
              onCheckedChange={(v) => update("verifiedOnly", v)}
              aria-label="Verified only"
            />
          </section>
        </div>

        {/* Sticky footer — Apply (primary CTA) + Reset all (secondary
            text-link), thumb-reach pair. Aligns with the standard mobile
            form pattern: primary action right, secondary action left.
            Reset is full text-meta height so the 44×44 tap target rule
            is met. */}
        <div className="flex items-center gap-4 border-t border-white/5 bg-bg-indigo px-5 pb-6 pt-3">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-tap shrink-0 px-2 text-meta font-medium text-text-secondary transition-colors hover:text-white"
            aria-label="Reset all filters"
          >
            Reset all
          </button>
          <Button
            size="cta"
            tone="cta"
            lift="float"
            className="flex-1"
            onClick={handleApply}
          >
            Apply filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
