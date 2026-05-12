"use client";

/**
 * /map — Discover Map screen (sub-plan 14 / Task 5).
 *
 * Composes the four T2–T4 primitives:
 *   - <PageHeader> + <PageHeaderTitle> for chrome ("Map")
 *   - <ContinentPicker> (T4) — 6-pill row above the map
 *   - <WorldMap> (T2) — pan/zoom SVG world primitive
 *   - <MapAvatar> (T3) — gradient stamp per candidate at their country centroid
 *
 * SAMPLE_PROFILES (8 candidates) render unfiltered for now. T7 introduces
 * the `showOnMap` privacy field and the filter becomes:
 *   SAMPLE_PROFILES.filter((p) => p.showOnMap !== false)
 * — for T5 every sample is shown.
 *
 * Marker tap navigates to /profile/[firstName]; the MapAvatar component
 * owns that behavior internally.
 *
 * Soft-completeness gate mirrors /discover: incomplete profiles are
 * redirected to the first missing onboarding step. The redirect runs in
 * a useEffect; before it fires we render a minimal placeholder to avoid
 * map flash for incomplete profiles.
 *
 * Bottom-CTA wiring + visible-bounds resolution is T6's work and is
 * deliberately left out here.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { BottomNav } from "@/components/app/bottom-nav";
import { ContinentPicker } from "@/components/app/continent-picker";
import { MapAvatar } from "@/components/app/map-avatar";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { WorldMap, type Viewport } from "@/components/app/world-map";

import type { BBox, Continent } from "@/lib/continent-bbox";
import {
  firstMissingStepFor,
  isDiscoverEligible,
} from "@/lib/profile-completeness";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";
import { useProfile } from "@/lib/use-profile";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Heuristic: convert a continent bbox to a (center, zoom) Viewport for
 * <WorldMap>. The map's d3-zoom scaleExtent runs 1..10 (1 = whole world).
 *
 * We use the longitudinal span as the primary signal — at NaturalEarth1
 * the horizontal extent dominates the visible area. A 360° span maps to
 * zoom 1; a 30°-or-narrower bbox saturates to zoom 8 (which is plenty
 * tight without overshooting the projection's edge cases).
 *
 * Lower-bounded at 30° (so we always show some surrounding context, not
 * a coffee-cup-sized continent shoved against the edges) and
 * upper-bounded at 8 (so a single small continent doesn't snap to the
 * maximum zoom).
 */
function viewportFromBbox(bbox: BBox): Viewport {
  const centerLng = (bbox.east + bbox.west) / 2;
  const centerLat = (bbox.north + bbox.south) / 2;
  const lngSpan = Math.abs(bbox.east - bbox.west);
  const zoom = Math.max(
    1,
    Math.min(8, Math.round(360 / Math.max(lngSpan, 30))),
  );
  return { center: [centerLng, centerLat], zoom };
}

export default function MapPage() {
  const router = useRouter();
  const { profile: viewer, loaded } = useProfile();

  // Discarded: visibleBounds, the bbox returned by <WorldMap onBoundsChange>.
  // T6 needs this to resolve "Like everyone visible" → set of candidates;
  // for T5 we just keep the prop wired so the debounce + computation path
  // exercises in the smoke walk.
  const [, setVisibleBounds] = useState<BBox | null>(null);
  const [viewport, setViewport] = useState<Viewport | undefined>(undefined);
  const [activeContinent, setActiveContinent] = useState<
    Continent | undefined
  >(undefined);

  // Soft-completeness gate — match /discover's pattern exactly.
  useEffect(() => {
    if (loaded && !isDiscoverEligible(viewer)) {
      const missingStep = firstMissingStepFor(viewer);
      if (missingStep) {
        router.replace(missingStep);
      }
    }
  }, [loaded, viewer, router]);

  const handlePickContinent = (id: Continent, bbox: BBox) => {
    setActiveContinent(id);
    setViewport(viewportFromBbox(bbox));
  };

  // Until T7 adds `showOnMap`, every sample renders. After T7:
  //   const visibleSamples = SAMPLE_PROFILES.filter((p) => p.showOnMap !== false);
  const visibleSamples = SAMPLE_PROFILES;

  // Pre-hydration or in-flight redirect — render minimal scaffold to keep
  // the map from flashing for an ineligible viewer.
  if (!loaded || (loaded && !isDiscoverEligible(viewer))) {
    return (
      <PageShell bottomPad="nav">
        <PageHeader pad="tight">
          <PageHeaderTitle>Map</PageHeaderTitle>
        </PageHeader>
        <div
          className="flex flex-1 items-center justify-center px-5"
          aria-live="polite"
        >
          <p className="text-body text-text-secondary">
            Redirecting to complete your profile…
          </p>
        </div>
        <BottomNav />
      </PageShell>
    );
  }

  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight">
        <PageHeaderTitle>Map</PageHeaderTitle>
      </PageHeader>

      <motion.div
        initial={fadeUp.initial}
        animate={fadeUp.animate}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="px-5"
      >
        <ContinentPicker
          active={activeContinent}
          onPick={handlePickContinent}
        />
      </motion.div>

      <motion.div
        initial={fadeUp.initial}
        animate={fadeUp.animate}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-4 px-5"
      >
        <WorldMap
          viewport={viewport}
          onBoundsChange={setVisibleBounds}
          className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated"
        >
          {visibleSamples.map((p) => (
            <MapAvatar key={p.firstName} candidate={p} />
          ))}
        </WorldMap>
      </motion.div>

      <BottomNav />
    </PageShell>
  );
}
