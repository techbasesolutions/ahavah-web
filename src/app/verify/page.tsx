"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Check, IdCard, Scan, Smartphone } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
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
    body: "Quick face-liveness check (anti-spoofing). Launching soon — Bronze or Gold today.",
    Icon: Scan,
    cta: "Coming soon",
    ctaState: "next" as const,
    soon: true,
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
  // as "No verification" | "Photos" | "Photos + ID".
  const { profile } = useProfile();
  const verificationLevel = (profile as Record<string, unknown>)["verification level"];
  const isBronzeDone =
    verificationLevel === "Photos" || verificationLevel === "Photos + ID";
  const isGoldDone = verificationLevel === "Photos + ID";

  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to profile"
          render={<Link href="/profile" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
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
