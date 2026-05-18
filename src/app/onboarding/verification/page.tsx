"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { IdCard, Scan, Smartphone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";

import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Mirrors the TIERS array in src/app/verify/page.tsx. Body copy is
// trimmed slightly here to read better at onboarding length, but the
// label / sub / color / icon set is identical to the /verify hub so the
// user's first encounter with the tier system matches what they'll see
// later from their profile.
const TIERS = [
  {
    key: "bronze",
    color: "#CD7F32",
    label: "Bronze",
    sub: "Profile verified",
    body: "Selfie + photo cross-check. Confirms you're a real person matching your photos.",
    Icon: Smartphone,
  },
  {
    key: "silver",
    color: "#C0C0C0",
    label: "Silver",
    sub: "Liveness verified",
    body: "Quick face-liveness check (anti-spoofing). Distinguishes you from a video or photo.",
    Icon: Scan,
  },
  {
    key: "gold",
    color: "#FFD700",
    label: "Gold",
    sub: "ID verified",
    body: "Government ID + face match. Highest trust signal.",
    Icon: IdCard,
  },
];

export default function VerificationStep() {
  return (
    <OnboardingShell
      href="/onboarding/verification"
      next="/onboarding/complete"
      ctaDisabled={false}
      ctaLabel="Skip for now"
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-(--ink)">
          Trust takes you further<span className="text-lime">.</span>
        </h1>
        <p className="text-body text-(--ink-2)">
          Pick where you want to start verifying. You can always upgrade later
          from your profile.
        </p>
      </motion.div>

      {/* Tier cards stagger in (bronze → silver → gold) matching the
          visual progression of the tier system on /verify. Every tier is
          an equally-valid starting point at onboarding time, so no
          "current" lavender-ring treatment — leans on the tier color as
          the primary signal. */}
      <div className="mt-8 flex flex-col gap-4">
        {TIERS.map((tier, i) => (
          <motion.div
            key={tier.key}
            {...fadeUp}
            transition={{ duration: 0.25, delay: 0.06 + Math.min(i, 4) * 0.04 }}
          >
            <Card
              tone="tier"
              className="gap-3 px-5 py-5"
              style={{ "--tier-color": tier.color } as React.CSSProperties}
            >
              <CardHeader className="flex-row items-center gap-3 px-0">
                <IconBadge tone="tier" size="xl">
                  <tier.Icon />
                </IconBadge>
                <div className="flex-1">
                  <h2 className="text-h3 text-(--ink)">{tier.label}</h2>
                  <p className="text-meta text-(--ink-2)">{tier.sub}</p>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <p className="text-body leading-relaxed text-(--ink)/85">
                  {tier.body}
                </p>
                <Link
                  href={`/verify/${tier.key}`}
                  prefetch={false}
                  className={cn(
                    buttonVariants({ variant: "outlineTier", size: "lg" }),
                    "mt-4 w-full rounded-full",
                  )}
                >
                  Start {tier.label} verification →
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </OnboardingShell>
  );
}
