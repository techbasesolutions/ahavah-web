"use client";

import { MultiSelectField, ProfileSection } from "@/components/app/profile-field";
import { useProfile } from "@/lib/use-profile";
import { INTERESTS, PERSONALITY_TRAITS } from "@/lib/profile-schema";

export default function InterestsSection() {
  const { profile, update } = useProfile();

  return (
    <ProfileSection
      title="Interests & personality"
      description="Helps surface people you'd actually talk to."
    >
      <MultiSelectField
        label="Interests"
        description="Pick all that apply"
        options={INTERESTS}
        value={profile.interests ?? []}
        onValueChange={(v) => update({ interests: v })}
      />
      <MultiSelectField
        label="Personality traits"
        description="Pick a few that describe you"
        options={PERSONALITY_TRAITS}
        value={profile.personalityTraits ?? []}
        onValueChange={(v) => update({ personalityTraits: v })}
      />
    </ProfileSection>
  );
}
