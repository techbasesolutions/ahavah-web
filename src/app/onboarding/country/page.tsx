"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";
import {
  ALL_COUNTRIES,
  POPULAR_COUNTRIES,
  type Country,
} from "@/lib/countries";

import { EmptyState } from "@/components/app/empty-state";
import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function CountryStep() {
  const { profile, update } = useProfile();
  const selected = profile.country ?? "";
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  // "Rest" = full ISO list minus the popular set, so the All-countries
  // section doesn't visually duplicate the rows shown above it.
  const restCountries = useMemo(() => {
    const popularCCs = new Set(POPULAR_COUNTRIES.map((c) => c.cc));
    return ALL_COUNTRIES.filter((c) => !popularCCs.has(c.cc));
  }, []);

  // Search hits scan the FULL list (popular + rest) so a popular country
  // also surfaces when typed, without producing duplicate sections.
  const searchResults = useMemo(
    () =>
      isSearching
        ? ALL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q))
        : [],
    [isSearching, q],
  );

  const showEmpty = isSearching && searchResults.length === 0;

  // Resolve the selected country to its full record so the summary row can
  // show flag + name without scrolling. Cheap O(n) lookup against the full
  // list — negligible at ~250 rows.
  const selectedCountry = selected
    ? ALL_COUNTRIES.find((c) => c.cc === selected)
    : undefined;

  return (
    <OnboardingShell href="/onboarding/country" ctaDisabled={!selected}>
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Where are you<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">
          We&apos;ll show people closer to you first.
        </p>
      </motion.div>

      {/* Selection summary — renders only when a country is picked so the
          user can confirm their choice without scrolling 250 rows. Sticky
          near the top, above the search; tap the X to clear and re-pick. */}
      {selectedCountry ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-lime/40 bg-lime/10 px-4 py-3"
          aria-live="polite"
        >
          <span className="text-h2" aria-hidden>
            {selectedCountry.flag}
          </span>
          <div className="flex flex-1 flex-col">
            <span className="text-overline text-lime">Selected</span>
            <span className="text-body font-semibold text-white">
              {selectedCountry.name}
            </span>
          </div>
          <Button
            size="circle"
            tone="overlay"
            aria-label={`Clear ${selectedCountry.name}`}
            onClick={() => update({ country: undefined })}
          >
            <X className="size-4" />
          </Button>
        </motion.div>
      ) : null}

      {/* Search row — leading magnifier + trailing clear-X (44px tap)
          when there's a query. With ~250 countries the search becomes the
          primary navigation, so its placeholder advertises the count. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative mt-6"
      >
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-text-muted"
        />
        <Input
          size="lg"
          tone="elevated"
          placeholder={`Search ${ALL_COUNTRIES.length} countries`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search countries"
          className={query.length > 0 ? "pl-10 pr-12" : "pl-10"}
        />
        {query.length > 0 && (
          <Button
            size="circle"
            tone="overlay"
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 size-8"
            onClick={() => setQuery("")}
          >
            <X className="size-4" />
          </Button>
        )}
      </motion.div>

      {/* Scrollable list — `min-h-0 flex-1 overflow-y-auto` is the load-bearing
          combination so the list scrolls *within* the shell instead of pushing
          the CTA off-screen. With ~250 rows we deliberately do NOT wrap each
          row in a motion.div (would be 250 motion contexts on first paint).
          Container fade-in is enough — per-row motion only matters with
          smaller lists. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-3 flex min-h-0 flex-1 flex-col"
        aria-busy={false}
      >
        {showEmpty ? (
          <EmptyState
            variant="no-search-results"
            title="No countries match"
            description={`Nothing matches "${query}". Try a different spelling.`}
            className="mx-0 mt-4"
          />
        ) : (
          <RadioGroup
            value={selected}
            onValueChange={(v) => update({ country: v as string })}
            aria-label="Select your country"
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-2"
          >
            {isSearching ? (
              <CountryRows countries={searchResults} selected={selected} />
            ) : (
              <>
                <SectionHeader>Popular</SectionHeader>
                <CountryRows countries={POPULAR_COUNTRIES} selected={selected} />
                <SectionHeader className="mt-5">All countries</SectionHeader>
                <CountryRows countries={restCountries} selected={selected} />
              </>
            )}
          </RadioGroup>
        )}
      </motion.div>
    </OnboardingShell>
  );
}

function SectionHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-1 pt-1 pb-2 text-overline text-text-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CountryRows({
  countries,
  selected,
}: {
  countries: ReadonlyArray<Country>;
  selected: string;
}) {
  return (
    <>
      {countries.map((c) => {
        const active = c.cc === selected;
        return (
          <Label
            key={c.cc}
            htmlFor={`country-${c.cc}`}
            className="block w-full cursor-pointer"
          >
            <Card
              tone="flat"
              className={cn(
                "flex flex-row items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98]",
                active
                  ? "bg-lime ring-2 ring-inset ring-lime"
                  : "hover:bg-bg-elevated/80 hover:ring-1 hover:ring-inset hover:ring-white/10",
              )}
            >
              <span className="text-h2" aria-hidden>
                {c.flag}
              </span>
              <span
                className={cn(
                  "flex-1 text-body font-medium",
                  active ? "text-black" : "text-white",
                )}
              >
                {c.name}
              </span>
              <RadioGroupItem
                id={`country-${c.cc}`}
                value={c.cc}
                variant="brand"
                className={
                  active
                    ? "border-black data-checked:bg-black data-checked:border-black"
                    : undefined
                }
              />
            </Card>
          </Label>
        );
      })}
    </>
  );
}
