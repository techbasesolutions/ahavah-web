"use client";

import Link from "next/link";

import {
  COMMUNICATION_PREFS,
  RELOCATIONS,
  intentOptionsForSex,
  type CommunicationPref,
  type Intent,
  type Relocation,
} from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";

import {
  MultiSelectField,
  ProfileSection,
  SingleSelectField,
} from "@/components/app/profile-field";
import { Card } from "@/components/ui/card";

/**
 * PracticalSection — Practical compatibility profile cluster (Sub-plan 03).
 * 3 fields: intent (gender-conditional), relocation, communicationPrefs.
 *
 * Intent requires profile.sex to be set first. If not set, renders a
 * fallback Card with an in-page anchor to the Gender field in IdentitySection
 * (id="field-sex"). The previous version drilled out to /onboarding/gender
 * — same anti-pattern eliminated for country + languages.
 *
 * Uses useProfile to read + write. Composes ProfileField helpers.
 */
export default function PracticalSection() {
  const { profile, update } = useProfile();

  const intentOpts = profile.sex ? intentOptionsForSex(profile.sex) : null;

  return (
    <ProfileSection
      title="Practical compatibility"
      description="The logistics that make a relationship work day-to-day."
    >
      {/* 1. intent (gender-conditional, multi-select) */}
      {intentOpts ? (
        <MultiSelectField
          label="What you're looking for"
          description="Pick every option that fits"
          options={intentOpts}
          value={profile.intent ?? []}
          onValueChange={(v: Intent[]) => update({ intent: v })}
        />
      ) : (
        <Card tone="default" className="rounded-xl px-4 py-3">
          <p className="text-meta text-(--ink-3)">
            Set your gender first to edit intent |{" "}
            <Link
              href="#field-sex"
              className="text-lime underline hover:text-lime/80"
            >
              set it above →
            </Link>
          </p>
        </Card>
      )}

      {/* 2. relocation */}
      <SingleSelectField
        id="relocation"
        label="Relocation"
        options={RELOCATIONS}
        value={profile.relocation}
        onValueChange={(v: Relocation) => update({ relocation: v })}
      />

      {/* 3. communicationPrefs */}
      <MultiSelectField
        label="Communication preferences"
        description="Pick how you'd like to keep in touch"
        options={COMMUNICATION_PREFS}
        value={profile.communicationPrefs ?? []}
        onValueChange={(v: CommunicationPref[]) =>
          update({ communicationPrefs: v })
        }
      />
    </ProfileSection>
  );
}
