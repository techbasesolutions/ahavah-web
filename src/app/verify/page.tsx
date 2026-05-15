"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, IdCard, Scan, Smartphone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { BackButton } from "@/components/app/back-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { Pill } from "@/components/kibo-ui/pill";

import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/use-profile";

import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIERS = [
  {
    key: "bronze",
    color: "#CD7F32",
    label: "Bronze",
    sub: "Profile verified",
    body: "Selfie + photo cross-check. Confirms you're a real person matching your photos.",
    Icon: Smartphone,
    cta: "Take a selfie",
    ctaState: "next" as const,
    soon: false,
  },
  {
    key: "silver",
    color: "#C0C0C0",
    label: "Silver",
    sub: "Liveness verified",
    body: "Three quick selfies at different angles confirm you're a real person, not a static photo.",
    Icon: Scan,
    cta: "Take 3 selfies",
    ctaState: "next" as const,
    soon: false,
  },
  {
    key: "gold",
    color: "#FFD700",
    label: "Gold",
    sub: "ID verified",
    body: "Government ID + face match (via Stripe Identity). Highest trust signal.",
    Icon: IdCard,
    cta: "Verify with government ID",
    ctaState: "next" as const,
    soon: false,
  },
];

export default function VerifyPage() {
  // Reflect real verification state instead of treating every user as
  // un-verified. Backend ships `verification level` from /profile-info
  // as "No verification" | "Photos" | "Photos + ID" (legacy upstream
  // ladder), AND `ahavah_verification_tier` ('none'|'bronze'|'silver'
  // |'gold') from migrations 0003 + 0012 (the new ladder Silver lives
  // on). Bronze stays gated on the legacy string for back-compat;
  // Silver + Gold prefer the tier ENUM since they only exist there.
  const { profile } = useProfile();
  const raw = profile as Record<string, unknown>;
  const verificationLevel = raw["verification level"];
  const userTier =
    typeof raw.ahavah_verification_tier === "string"
      ? raw.ahavah_verification_tier
      : "none";
  const isBronzeDone =
    verificationLevel === "Photos" ||
    verificationLevel === "Photos + ID" ||
    userTier === "bronze" ||
    userTier === "silver" ||
    userTier === "gold";
  const isSilverDone = userTier === "silver" || userTier === "gold";
  const isGoldDone =
    verificationLevel === "Photos + ID" || userTier === "gold";

  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <BackButton fallback="/profile" label="Back to profile" />
        <PageHeaderTitle>Get verified</PageHeaderTitle>
      </PageHeader>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="px-5 pt-2 pb-4 text-meta text-text-secondary"
      >
        Verified profiles get more matches and signal you&apos;re a real person.
      </motion.p>

      {/* Tier cards stagger in (bronze → silver → gold) matching the
          visual progression of the tier system. */}
      <div className="flex flex-col gap-4 px-5">
        {TIERS.map((tier, i) => {
          const tierDone =
            (tier.key === "bronze" && isBronzeDone) ||
            (tier.key === "silver" && isSilverDone) ||
            (tier.key === "gold" && isGoldDone);
          return (
          <motion.div
            key={tier.key}
            {...fadeUp}
            transition={{ duration: 0.25, delay: 0.06 + Math.min(i, 4) * 0.04 }}
          >
            <Card
              tone="tierInactive"
              className="gap-3 px-5 py-5"
              style={{ "--tier-color": tier.color } as React.CSSProperties}
            >
              <CardHeader className="flex-row items-center gap-3 px-0">
                <div className="w-fit rounded-full ring-2 ring-lavender/30">
                  <IconBadge tone="tier" size="xl">
                    <tier.Icon />
                  </IconBadge>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-h3 text-white">{tier.label}</h2>
                    {tierDone ? (
                      <Pill variant="lavender">
                        <Check size={12} /> Verified
                      </Pill>
                    ) : tier.soon ? (
                      <Pill variant="lavender">Coming soon</Pill>
                    ) : null}
                  </div>
                  <p className="text-meta text-text-secondary">{tier.sub}</p>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <p className="text-body leading-relaxed text-white/85">
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
                  {tierDone ? "View status" : tier.cta}
                </Link>
              </CardContent>
            </Card>
          </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
