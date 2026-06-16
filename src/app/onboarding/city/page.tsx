"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ALL_COUNTRIES } from "@/lib/countries";

import { LocationField } from "@/components/app/location-field";
import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/**
 * CityStep — precision-locality refinement that runs immediately AFTER the
 * country step. The country step already resolved coordinates to an
 * in-country centroid; here the user optionally narrows that to their
 * actual city via the /search-locations typeahead.
 *
 * Picking a result PATCHes `location` with the chosen long_friendly string
 * — the SAME field + mechanism the country step uses — so the backend
 * re-resolves person.coordinates + location_short_friendly +
 * location_long_friendly + country from the picked city.
 *
 * This step is OPTIONAL. Continue is always enabled: a user with no city
 * pick simply keeps the country-centroid coordinates and proceeds. The
 * city is NOT a discover-eligibility gate (no requiredField in wizard-flow).
 */
export default function CityStep() {
  const { profile, update } = useProfile();

  // Hydration guard: profile.location / profile.country come from
  // localStorage on mount, so the server renders without them and the
  // client renders with them. Mount-gating the cache-derived summary +
  // heading eliminates the SSR/CSR divergence that intermittently breaks
  // event-handler binding (same class of bug fixed on /onboarding/country).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const selectedLocation = mounted ? profile.location ?? "" : "";

  // Heading personalises to the picked country when known ("Where in
  // Jamaica?"), falling back to a generic phrasing pre-mount or when the
  // country code doesn't resolve.
  const countryName = mounted && profile.country
    ? ALL_COUNTRIES.find((c) => c.cc === profile.country)?.name
    : undefined;

  const handlePickCity = (longFriendly: string) => {
    void update({ location: longFriendly });
  };

  return (
    <OnboardingShell href="/onboarding/city">
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-(--ink)">
          {countryName ? (
            <>
              Where in {countryName}
              <span className="text-lime">?</span>
            </>
          ) : (
            <>
              Where exactly<span className="text-lime">?</span>
            </>
          )}
        </h1>
        <p className="text-body text-(--ink-2)">
          Pick your city so we place you precisely on the map. You can skip
          this and stay placed near your country.
        </p>
      </motion.div>

      {/* Selection summary — renders only once a city is picked so the user
          can confirm the resolved place. Mirrors the country step's
          selected-summary card. Gated on `mounted` to avoid an SSR/CSR
          hydration mismatch (cache isn't readable during SSR). */}
      {mounted && selectedLocation ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-lime/40 bg-lime/10 px-4 py-3"
          aria-live="polite"
        >
          <MapPin className="size-5 shrink-0 text-lime" aria-hidden />
          <div className="flex flex-1 flex-col">
            <span className="text-overline text-lime">Selected</span>
            <span className="text-body font-semibold text-(--ink)">
              {selectedLocation}
            </span>
          </div>
          <Button
            size="circle-lg"
            tone="overlay"
            aria-label={`Clear ${selectedLocation}`}
            onClick={() => update({ location: undefined })}
          >
            <X className="size-4" />
          </Button>
        </motion.div>
      ) : null}

      {/* City typeahead — debounced /search-locations search. Selecting a
          result PATCHes `location` (long_friendly), same as the country
          step. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mt-6"
      >
        <LocationField
          id="city-search"
          label="Your city"
          placeholder="Type your city or town"
          description="Start typing to search. Pick the closest match."
          value={selectedLocation || undefined}
          onSelect={handlePickCity}
        />
      </motion.div>
    </OnboardingShell>
  );
}
