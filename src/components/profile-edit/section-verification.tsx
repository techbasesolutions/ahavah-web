"use client";

import {
  VERIFICATION_TAGS,
  type VerificationTag,
} from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";

import {
  ProfileSection,
  MultiSelectField,
} from "@/components/app/profile-field";

/**
 * VerificationSection — Verification profile cluster.
 * Verification tags field.
 *
 * Uses useProfile to read + write. Composes ProfileField helpers.
 * Note: /onboarding/verification screen handles initial setup; this section
 * lets users add MORE verifications post-onboarding.
 */
export default function VerificationSection() {
  const { profile, update } = useProfile();

  return (
    <ProfileSection
      title="Verification"
      description="Trust signals we apply to your profile."
    >
      {/* verificationTags */}
      <MultiSelectField
        label="Verification"
        description="Verifications you've completed"
        options={VERIFICATION_TAGS}
        value={profile.verificationTags ?? []}
        onValueChange={(v: VerificationTag[]) => update({ verificationTags: v })}
      />
    </ProfileSection>
  );
}
