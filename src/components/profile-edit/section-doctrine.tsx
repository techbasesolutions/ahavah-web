"use client";

import {
  HEAD_COVERINGS,
  POLYGYNY_VIEWS,
  TZITZIT_OPTIONS,
  type HeadCovering,
  type Polygyny,
  type Tzitzit,
} from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";

import {
  ProfileSection,
  SingleSelectField,
} from "@/components/app/profile-field";

/**
 * DoctrineSection — Doctrine profile cluster (Sub-plan 03).
 * 3 fields: polygyny, headCovering, tzitzit.
 *
 * Uses useProfile to read + write. Composes ProfileField helpers.
 */
export default function DoctrineSection() {
  const { profile, update } = useProfile();

  return (
    <ProfileSection
      title="Doctrine"
      description="Where you stand on key practice questions."
    >
      {/* 1. polygyny */}
      <SingleSelectField
        id="polygyny"
        label="Polygyny view"
        options={POLYGYNY_VIEWS}
        value={profile.polygyny}
        onValueChange={(v: Polygyny) => update({ polygyny: v })}
      />

      {/* 2. headCovering */}
      <SingleSelectField
        id="headCovering"
        label="Head covering practice"
        options={HEAD_COVERINGS}
        value={profile.headCovering}
        onValueChange={(v: HeadCovering) => update({ headCovering: v })}
      />

      {/* 3. tzitzit */}
      <SingleSelectField
        id="tzitzit"
        label="Tzitzit practice"
        options={TZITZIT_OPTIONS}
        value={profile.tzitzit}
        onValueChange={(v: Tzitzit) => update({ tzitzit: v })}
      />
    </ProfileSection>
  );
}
