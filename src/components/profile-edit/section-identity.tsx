"use client";

import {
  EDUCATIONS,
  ETHNICITIES,
  NATIONALITIES,
  type EducationLevel,
  type Ethnicity,
  type Nationality,
  type Sex,
} from "@/lib/profile-schema";
import { ALL_COUNTRIES } from "@/lib/countries";
import { LANGUAGES, labelForLanguage } from "@/lib/languages";
import { useProfile } from "@/lib/use-profile";

import {
  ComboboxField,
  MultiComboboxField,
  MultiSelectField,
  ProfileSection,
  SelectField,
  SingleSelectField,
  TextField,
} from "@/components/app/profile-field";

const SEX_OPTIONS: ReadonlyArray<{ value: Sex; label: string }> = [
  { value: "male", label: "Man" },
  { value: "female", label: "Woman" },
];

/**
 * IdentitySection — Basic Identity profile cluster (Sub-plan 03).
 * 13 fields: firstName, displayName, age, sex, country, stateOrProvince,
 * city, nationality, ethnicities, languages (link-out), occupation,
 * education, bio.
 *
 * Uses useProfile to read + write. Composes ProfileField helpers.
 */
export default function IdentitySection() {
  const { profile, update } = useProfile();

  return (
    <ProfileSection
      title="Basic Identity"
      description="Tell us about yourself"
    >
      {/* 1. firstName */}
      <TextField
        id="firstName"
        label="First Name"
        value={profile.firstName ?? ""}
        onChange={(v) => update({ firstName: v || undefined })}
        maxLength={30}
        helper="Just your first name"
      />

      {/* 2. displayName */}
      <TextField
        id="displayName"
        label="Display Name"
        value={profile.displayName ?? ""}
        onChange={(v) => update({ displayName: v || undefined })}
        maxLength={40}
        helper="Optional — overrides first name in matches"
        placeholder="E.g. Sarah or Sarah from Jamaica"
      />

      {/* 3. age */}
      <TextField
        id="age"
        label="Age"
        value={profile.age ? String(profile.age) : ""}
        onChange={(v) =>
          update({
            age: v ? Number(v.replace(/\D/g, "")) || undefined : undefined,
          })
        }
        maxLength={2}
        type="text"
        helper="Must be 18 or older"
      />

      {/* 4. sex */}
      <SingleSelectField
        id="sex"
        label="Gender"
        options={SEX_OPTIONS}
        value={profile.sex}
        onValueChange={(v) => update({ sex: v })}
      />

      {/* 5. country — ComboboxField (search-as-you-type) drawing from the
          full ALL_COUNTRIES list. No more 2-letter text input + drill-out
          to /onboarding/country to find the picker. */}
      <ComboboxField
        id="country"
        label="Country"
        placeholder="Type or pick your country"
        options={ALL_COUNTRIES.map((c) => ({
          value: c.cc,
          label: `${c.flag} ${c.name}`,
        }))}
        value={profile.country}
        onValueChange={(v: string) => update({ country: v })}
      />

      {/* 6. stateOrProvince */}
      <TextField
        id="stateOrProvince"
        label="State / Province"
        value={profile.stateOrProvince ?? ""}
        onChange={(v) => update({ stateOrProvince: v || undefined })}
        maxLength={50}
      />

      {/* 7. city */}
      <TextField
        id="city"
        label="City"
        value={profile.city ?? ""}
        onChange={(v) => update({ city: v || undefined })}
        maxLength={50}
      />

      {/* 8. nationality — ComboboxField. Type to filter; the dropdown
          stays visible while focused so users can also scan/pick
          without typing. Better than a static RadioGroup+Card grid at
          this list size (20 options). */}
      <ComboboxField
        id="nationality"
        label="Nationality"
        placeholder="Type or pick your nationality"
        options={NATIONALITIES}
        value={profile.nationality}
        onValueChange={(v: Nationality) => update({ nationality: v })}
      />

      {/* 9. ethnicities */}
      <MultiSelectField
        label="Ethnicities"
        description="Pick all that apply"
        options={ETHNICITIES}
        value={profile.ethnicities ?? []}
        onValueChange={(v: Ethnicity[]) => update({ ethnicities: v })}
      />

      {/* 10. languages — MultiComboboxField (search-as-you-type, ~70-
          language curated list, removable chips for selected items).
          Custom-added languages from /onboarding/languages (prefixed
          with CUSTOM_LANGUAGE_PREFIX) pass through unchanged because
          labelForLanguage resolves them by stripping the prefix. */}
      <MultiComboboxField
        id="languages"
        label="Languages"
        description="Type to search, then tap to add. Tap a chip to remove."
        placeholder="Type a language…"
        options={LANGUAGES.map((l) => ({
          value: l.code,
          label: `${l.flag} ${l.label}`,
        }))}
        value={profile.languages ?? []}
        onValueChange={(v: string[]) => update({ languages: v })}
        labelForValue={labelForLanguage}
      />

      {/* 11. occupation */}
      <TextField
        id="occupation"
        label="Occupation"
        value={profile.occupation ?? ""}
        onChange={(v) => update({ occupation: v || undefined })}
        maxLength={80}
      />

      {/* 12. education — SelectField (dropdown). Short list (8 options),
          single-select; matches the same elevated form-row pattern. */}
      <SelectField
        id="education"
        label="Education"
        placeholder="Pick the closest level"
        options={EDUCATIONS}
        value={profile.education}
        onValueChange={(v: EducationLevel) => update({ education: v })}
      />

      {/* 13. bio */}
      <TextField
        id="bio"
        label="Bio / Testimony"
        value={profile.bio ?? ""}
        onChange={(v) => update({ bio: v || undefined })}
        maxLength={500}
        multiline
        helper="Tip: 50–200 characters works well"
        placeholder="Tell us what makes you unique, your faith journey, or what you're looking for..."
      />
    </ProfileSection>
  );
}
