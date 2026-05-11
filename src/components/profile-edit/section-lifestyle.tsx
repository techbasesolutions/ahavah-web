"use client";

import { MultiSelectField, ProfileSection } from "@/components/app/profile-field";
import { useProfile } from "@/lib/use-profile";
import {
  FAMILY_VIEWS,
  HEALTH_TAGS,
  LIVING_PREFERENCES,
} from "@/lib/profile-schema";

export default function LifestyleSection() {
  const { profile, update } = useProfile();

  return (
    <ProfileSection
      title="Lifestyle"
      description="What kind of life you're building."
    >
      <MultiSelectField
        label="Family views"
        description="Pick all that apply"
        options={FAMILY_VIEWS}
        value={profile.familyViews ?? []}
        onValueChange={(v) => update({ familyViews: v })}
      />
      <MultiSelectField
        label="Living preferences"
        description="Pick all that apply"
        options={LIVING_PREFERENCES}
        value={profile.livingPreferences ?? []}
        onValueChange={(v) => update({ livingPreferences: v })}
      />
      <MultiSelectField
        label="Health & lifestyle"
        description="Pick all that apply"
        options={HEALTH_TAGS}
        value={profile.healthTags ?? []}
        onValueChange={(v) => update({ healthTags: v })}
      />
    </ProfileSection>
  );
}
