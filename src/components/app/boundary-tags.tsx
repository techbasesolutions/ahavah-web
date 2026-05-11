"use client";

import { Card } from "@/components/ui/card";
import { MultiSelectField } from "@/components/app/profile-field";
import { BOUNDARY_TAGS, type BoundaryTag } from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";

/**
 * BoundaryTagsPicker — lets the user select their profile.boundaryTags.
 * Self-contained client component; wraps MultiSelectField + explainer card.
 * Reusable on /profile/edit and /settings/boundaries.
 */
export function BoundaryTagsPicker() {
  const { profile, update } = useProfile();

  return (
    <div className="flex flex-col gap-4">
      {/* Explainer card */}
      <Card tone="elevated" className="rounded-2xl px-4 py-3">
        <h2 className="text-h3 text-white mb-2">What boundaries do.</h2>
        <p className="text-meta text-text-secondary">
          Boundaries are personal filters Ahavah applies on your behalf. Pick
          what&apos;s non-negotiable. We never show you matches that violate a
          boundary you&apos;ve set.
        </p>
      </Card>

      {/* Picker */}
      <MultiSelectField
        label="Boundaries"
        description="Auto-applied as hard filters in Discovery. Candidates who don't meet your boundaries won't appear."
        options={BOUNDARY_TAGS}
        value={profile.boundaryTags ?? []}
        onValueChange={(v: BoundaryTag[]) => update({ boundaryTags: v })}
      />
    </div>
  );
}
