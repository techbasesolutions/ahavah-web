"use client";

import {
  VERIFICATION_TAGS,
  BOUNDARY_TAGS,
  type VerificationTag,
  type BoundaryTag,
} from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";

import {
  ProfileSection,
  MultiSelectField,
} from "@/components/app/profile-field";

/**
 * VerificationSection — Verification & boundaries profile cluster (Sub-plan 03).
 * 2 fields: verificationTags, boundaryTags.
 *
 * Uses useProfile to read + write. Composes ProfileField helpers.
 * Note: /onboarding/verification screen handles initial setup; this section
 * lets users add MORE verifications + boundaries post-onboarding.
 */
export default function VerificationSection() {
  const { profile, update } = useProfile();

  return (
    <ProfileSection
      title="Verification & boundaries"
      description="Trust signals + hard filters we apply to your match queue."
    >
      {/* 1. verificationTags */}
      <MultiSelectField
        label="Verification"
        description="Verifications you've completed"
        options={VERIFICATION_TAGS}
        value={profile.verificationTags ?? []}
        onValueChange={(v: VerificationTag[]) => update({ verificationTags: v })}
      />

      {/* 2. boundaryTags */}
      <MultiSelectField
        label="Boundaries"
        description="Auto-filter matches that don't meet these"
        options={BOUNDARY_TAGS}
        value={profile.boundaryTags ?? []}
        onValueChange={(v: BoundaryTag[]) => update({ boundaryTags: v })}
      />
    </ProfileSection>
  );
}
