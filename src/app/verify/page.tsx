"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Check, IdCard, Scan, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";

import { cn } from "@/lib/utils";

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
    ctaState: "current" as const,
  },
  {
    key: "silver",
    color: "#C0C0C0",
    label: "Silver",
    sub: "Liveness verified",
    body: "Quick face-liveness check (anti-spoofing). Distinguishes you from a video or photo.",
    Icon: Scan,
    cta: "Start liveness check",
    ctaState: "next" as const,
  },
  {
    key: "gold",
    color: "#FFD700",
    label: "Gold",
    sub: "ID verified",
    body: "Government ID + face match. Highest trust signal.",
    Icon: IdCard,
    cta: "Verify with government ID",
    ctaState: "next" as const,
  },
];

export default function VerifyPage() {
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
          const isCurrent = tier.ctaState === "current";
          return (
            <motion.div
              key={tier.key}
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.08 + i * 0.08 }}
            >
              <Card
                tone={isCurrent ? "tier" : "tierInactive"}
                className="gap-3 px-5 py-5"
                style={{ "--tier-color": tier.color } as React.CSSProperties}
              >
                <CardHeader className="flex-row items-center gap-3 px-0">
                  <IconBadge tone="tier" size="xl">
                    <tier.Icon />
                  </IconBadge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-h3 text-white">{tier.label}</h2>
                      {isCurrent && (
                        <Badge variant="tier" className="text-overline">
                          <Check size={10} className="mr-1" /> Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-meta text-text-secondary">{tier.sub}</p>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  <p className="text-body leading-relaxed text-white/85">
                    {tier.body}
                  </p>
                  {!isCurrent && (
                    <Link
                      href={`/verify/${tier.key}`}
                      prefetch={false}
                      className={cn(
                        buttonVariants({ variant: "outlineTier", size: "lg" }),
                        "mt-4 w-full rounded-full",
                      )}
                    >
                      {tier.cta}
                    </Link>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
