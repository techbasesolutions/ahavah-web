"use client";

import {
  ASSEMBLIES,
  CALENDARS,
  FEAST_DAYS,
  SHABBATS,
  TORAH_LEVELS,
  type Assembly,
  type Calendar,
  type FeastDay,
  type Shabbat,
  type TorahLevel,
} from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";
import {
  MultiSelectField,
  ProfileSection,
  SingleSelectField,
} from "@/components/app/profile-field";

/**
 * FaithSection — edit self-description, Torah observance stage, Shabbat
 * observance, feast days, and calendar system. All fields optional
 * (soft-completeness model).
 *
 * Uses useProfile() + ProfileField helpers for controlled read/write.
 */
export default function FaithSection() {
  const { profile, update } = useProfile();

  return (
    <ProfileSection
      title="Faith"
      description="What you believe and how you keep it."
    >
      <MultiSelectField<Assembly>
        label="I identify as"
        description="Pick every term that fits."
        options={ASSEMBLIES}
        value={profile.assembly ?? []}
        onValueChange={(v) => update({ assembly: v })}
      />

      <SingleSelectField<TorahLevel>
        id="torah-level"
        label="Torah observance stage"
        options={TORAH_LEVELS}
        value={profile.torahLevel}
        onValueChange={(v) => update({ torahLevel: v })}
      />

      <SingleSelectField<Shabbat>
        id="shabbat"
        label="Shabbat observance"
        options={SHABBATS}
        value={profile.shabbat}
        onValueChange={(v) => update({ shabbat: v })}
      />

      <MultiSelectField<FeastDay>
        label="Feast days"
        description="Pick all you observe."
        options={FEAST_DAYS}
        value={profile.feastDays ?? []}
        onValueChange={(v) => update({ feastDays: v })}
      />

      <SingleSelectField<Calendar>
        id="calendar"
        label="Calendar system"
        options={CALENDARS}
        value={profile.calendar}
        onValueChange={(v) => update({ calendar: v })}
      />
    </ProfileSection>
  );
}
