"use client";

import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";

import {
  VERIFICATION_TAGS,
  type VerificationTag,
} from "@/lib/profile-schema";
import { useProfile } from "@/lib/use-profile";

import { ProfileSection } from "@/components/app/profile-field";
import { Pill } from "@/components/kibo-ui/pill";
import { Button } from "@/components/ui/button";

/**
 * VerificationSection — read-only summary of verification trust signals.
 *
 * Used to be a MultiSelectField where the user could tick "Government ID
 * verified" or "Assembly verified" themselves. That defeated the entire
 * point of verification — the value of the badge is that *the server*
 * granted it after the user actually completed the flow.
 *
 * Now it renders:
 *   - The user's actual `verification level` from /profile-info
 *     ("No verification" / "Photos" / "Photos + ID") with a status pill.
 *   - Each VerificationTag the server has confirmed (read-only Check
 *     pills); empty list reads "No verifications yet".
 *   - A CTA pointing to /verify where the user can start the real flow.
 */
export default function VerificationSection() {
  const { profile } = useProfile();
  const verificationLevelRaw = (profile as Record<string, unknown>)["verification level"];
  const verificationLevel =
    typeof verificationLevelRaw === "string" ? verificationLevelRaw : null;
  // Real, server-confirmed tags. Profile.verificationTags is set only
  // by the backend at verification-flow completion — no longer mutable
  // from this section.
  const earnedTags: ReadonlyArray<VerificationTag> = profile.verificationTags ?? [];

  return (
    <ProfileSection
      title="Verification"
      description="Trust signals we apply to your profile."
    >
      {/* Server-granted level pill — same source as /profile + /verify. */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-lavender" />
        <span className="text-meta text-(--ink)">
          {verificationLevel === "Photos + ID"
            ? "Gold - ID verified"
            : verificationLevel === "Photos"
              ? "Bronze - Photo verified"
              : "Not yet verified"}
        </span>
      </div>

      {/* Earned tags, read-only. Renders an honest empty state when
          nothing's been granted yet — better than the previous control
          which let users tick badges they hadn't actually earned. */}
      {earnedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {earnedTags.map((tag) => {
            const opt = VERIFICATION_TAGS.find((o) => o.value === tag);
            return (
              <Pill key={tag} variant="lime" size="sm">
                <Check size={12} />
                {opt?.label ?? tag}
              </Pill>
            );
          })}
        </div>
      ) : (
        <p className="text-caption text-(--ink-3)">
          You haven&apos;t earned any verification badges yet. Complete a
          tier on the Verification page to add real trust signals to your
          profile.
        </p>
      )}

      <Button
        nativeButton={false}
        variant="outline"
        size="lg"
        render={<Link href="/verify" prefetch={false} />}
      >
        Manage verification
      </Button>
    </ProfileSection>
  );
}
