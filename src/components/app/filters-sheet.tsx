"use client";

import * as React from "react";
import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";

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
import { useIsDesktop } from "@/lib/use-is-desktop";

import {
  ASSEMBLIES,
  CALENDARS,
  EDUCATIONS,
  MARITAL_STATUSES,
  POLYGYNY_VIEWS,
  TORAH_LEVELS,
  type Assembly,
  type Calendar,
  type EducationLevel,
  type HealthTag,
  type Intent,
  type MaritalStatus,
  type Polygyny,
  type Sex,
  intentOptionsForSex,
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
 *   text-caption text-(--ink-3) (helper).
 * - Pill grids WRAP — `flex-wrap` so labels never overflow. The
 *   underlying ToggleGroup primitive is flex-row by default, so we
 *   override via className. No `width="full"` (which would force
 *   equal widths — wrong for variable-length labels).
 * - Apply / Reset land in a sticky footer so they're always reachable
 *   on a long filter list.
 */

// Intent labels are sex-scoped to the VIEWER. A man choosing intents for
// his own search picks from MALE_INTENT_LABELS ('first wife', 'additional
// wife', …) — those describe what he's seeking. A woman picks from
// FEMALE_INTENT_LABELS ('unmarried man', 'married man', …) — what she's
// seeking. Showing the cross-sex list (the prior hardcoded union of all 9
// values) confused viewers into thinking the filter described candidates
// of the same sex as themselves. Resolved by deferring to
// intentOptionsForSex(viewerSex) below.

const HAS_CHILDREN_OPTIONS: ReadonlyArray<{ value: "has" | "none"; label: string }> = [
  { value: "has",  label: "Has children" },
  { value: "none", label: "No children" },
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
  maritalStatuses?: ReadonlyArray<MaritalStatus>;
  hasChildrenBuckets?: ReadonlyArray<"has" | "none">;
  country?: ReadonlyArray<string>;
  languages?: ReadonlyArray<string>;
  verifiedOnly?: boolean;
  mapLens?: boolean;
};

const DEFAULT_FILTERS: DiscoverFiltersState = {
  ageMin: 18,
  ageMax: 80,
  verifiedOnly: false,
  mapLens: false,
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
      className="group border-b border-(--hairline) last:border-b-0"
      open={defaultOpen}
    >
      <summary
        className={cn(
          "flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 py-3",
          "text-overline text-(--ink-2)",
          "transition-colors hover:text-(--ink)",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span>{label}</span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3 pb-4">
        {description ? (
          <p className="text-caption text-(--ink-3)">{description}</p>
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
  /** Controlled open state. If omitted, the sheet manages its own state. */
  open?: boolean;
  /** Controlled state setter. Required when `open` is set. */
  onOpenChange?: (next: boolean) => void;
  /**
   * Viewer's sex. Filter Intent options must match what the CANDIDATES
   * (opposite sex) have stored as their intent — a man filters women
   * by what women chose, so he sees FEMALE_INTENT_LABELS; a woman
   * filters men by what men chose, so she sees MALE_INTENT_LABELS.
   * Showing the viewer's own-sex labels was wrong: those are role-
   * specific values nobody on the opposite side can ever have (a
   * woman's stored intent is never "first-wife"; a man's is never
   * "married-man"), so the filter would never match anyone.
   * Optional for legacy callers; falls back to universal modifiers
   * only (courtship / marriage-only / local-only).
   */
  viewerSex?: Sex;
};

const OPPOSITE_SEX: Record<Sex, Sex> = { male: "female", female: "male" };

export function FiltersSheet({
  trigger,
  initialFilters,
  onApply,
  open: openProp,
  onOpenChange,
  viewerSex,
}: FiltersSheetProps) {
  const intentFilterOptions = viewerSex
    ? intentOptionsForSex(OPPOSITE_SEX[viewerSex])
    : // No viewer sex yet — render only the universally-shared modifiers
      // so we never leak the wrong sex's labels. These three appear in
      // both MALE and FEMALE option lists in profile-schema.ts.
      ([
        { value: "courtship",     label: "Courtship" },
        { value: "marriage-only", label: "Marriage only" },
        { value: "local-only",    label: "Local only" },
      ] as ReadonlyArray<{ value: Intent; label: string }>);
  const [internalOpen, setInternalOpen] = useState(false);
  const isDesktop = useIsDesktop();
  // Controlled when both `open` and `onOpenChange` are provided; otherwise
  // uncontrolled. Lets /discover share the sheet between the Globe button
  // (uncontrolled via SheetTrigger) and the empty-deck "Adjust filters"
  // CTA (controlled — calls setFiltersOpen(true) from EmptyState action).
  const open = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };
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
      {/* The trigger is always a kit <Button> (no render prop), which
          renders a NATIVE <button>. SheetTrigger must therefore declare
          nativeButton={true} so Base UI doesn't warn about adding
          non-native attrs to a real button. Was false, which threw a
          console error on every /discover + /map mount. */}
      <SheetTrigger nativeButton render={trigger} />
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "flex max-h-dvh flex-col gap-0 border-(--hairline) bg-(--app) p-0",
          isDesktop ? "w-full sm:max-w-md" : "rounded-t-3xl",
        )}
      >
        <SheetHeader className="items-center px-5 pt-6 pb-3">
          <SheetTitle className="text-h2 text-(--ink)">Filters</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 pb-4">
          <section className="flex flex-col gap-3 border-b border-(--hairline) py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-overline text-(--ink-2)">Age range</h3>
              <span className="text-meta tabular-nums text-(--ink)">
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

          {/* Country filter is driven by the /map tab — panning/zooming the
              map writes `filters.country` from the visible bbox (sub-plan
              17 T2). The manual Country pill grid that used to live here
              was removed (T3) because dual control was confusing; the map
              is the single country-filter UI. The Languages section was
              also removed (T3): ~70 non-exhaustive options against a
              250-country backdrop was bad UX. The language scoring axis
              (sub-plan 13 T3) still influences deck order; it's just no
              longer a hard filter via UI. */}
          <p className="px-3 pt-2 text-caption text-(--ink-3)">
            Filter by location on the Map tab.
          </p>

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
              options={intentFilterOptions}
              value={filters.intents ?? []}
              onValueChange={(v) =>
                update("intents", v.length > 0 ? (v as Intent[]) : undefined)
              }
            />
          </FilterSection>

          <FilterSection label="Marital status">
            <PillGrid
              ariaLabel="Filter by marital status"
              options={MARITAL_STATUSES}
              value={filters.maritalStatuses ?? []}
              onValueChange={(v) =>
                update("maritalStatuses", v.length > 0 ? (v as MaritalStatus[]) : undefined)
              }
            />
          </FilterSection>

          <FilterSection label="Children">
            <PillGrid
              ariaLabel="Filter by parental status"
              options={HAS_CHILDREN_OPTIONS}
              value={filters.hasChildrenBuckets ?? []}
              onValueChange={(v) =>
                update("hasChildrenBuckets", v.length > 0 ? (v as Array<"has" | "none">) : undefined)
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

          <section className="flex items-center justify-between gap-3 border-b border-(--hairline) py-4 last:border-b-0">
            <div className="flex flex-col gap-1">
              <h3 className="text-overline text-(--ink-2)">Verified only</h3>
              <p className="text-caption text-(--ink-3)">
                Only show profiles with at least one verification.
              </p>
            </div>
            <Switch
              checked={filters.verifiedOnly ?? false}
              onCheckedChange={(v) => update("verifiedOnly", v)}
              aria-label="Verified only"
            />
          </section>

          {/* Map lens (SOT: "Ahavah Map Lens" export). Copies the
              Verified-only row anatomy exactly, plus a small lavender
              map pin marking the row as map-linked. Caption changes
              with state per the design notes: off explains what turning
              it on does, on explains the silent update rule. */}
          <section className="flex items-center justify-between gap-3 border-b border-(--hairline) py-4 last:border-b-0">
            <div className="flex flex-col gap-1">
              <h3 className="flex items-center gap-1.5 text-overline text-(--ink-2)">
                <MapPin className="size-3.5 shrink-0 text-lavender" aria-hidden />
                Use my map view
              </h3>
              <p className="text-caption text-(--ink-3)">
                {filters.mapLens
                  ? "Updates whenever you leave the map page."
                  : "People in the area you last viewed on the map appear first."}
              </p>
            </div>
            <Switch
              checked={filters.mapLens ?? false}
              onCheckedChange={(v) => update("mapLens", v)}
              aria-label="Use my map view"
            />
          </section>
        </div>

        <div className="flex items-center gap-4 border-t border-(--hairline) bg-(--app) px-5 pb-6 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="tap"
            onClick={handleReset}
            aria-label="Reset all filters"
            className="text-(--ink-2) hover:text-(--ink)"
          >
            Reset all
          </Button>
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
