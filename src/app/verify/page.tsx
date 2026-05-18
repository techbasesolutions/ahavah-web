"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, IdCard, Scan, Smartphone } from "lucide-react";

import { BackButton } from "@/components/app/back-button";
import { Card } from "@/components/ui/card";
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

  // ── Shared tier card renderer — canonical 3-col grid (per
  // screens/12-verify.md §Tier card + desktop.jsx VerifyDesktop). Layout:
  //   [60×60 tier-color tile] [1fr middle content] [auto right action]
  // Mobile uses a stacked layout because the 3-col would crush at 414px.
  const tierCards = (isDone: (key: string) => boolean, cardClassName?: string) => {
    // "Active step" = first undone tier in the bronze→silver→gold ladder.
    // Per canonical: that tier's CTA button gets a 12% tier-tinted bg fill
    // so it stands out as the recommended next action.
    const firstUndoneKey = TIERS.find((t) => !isDone(t.key))?.key ?? null;
    return TIERS.map((tier, i) => {
      const done = isDone(tier.key);
      const isNextStep = !done && tier.ctaState === "next" && tier.key === firstUndoneKey;
      const card = (
        <Card
          tone="default"
          className={cn(
            "p-6 rounded-[22px] gap-0",
            // Canonical: inset 0 0 0 1.5px <tierColor> when done OR active,
            // hairline otherwise. Implemented via inline boxShadow because
            // Tailwind has no built-in for inset-ring-with-arbitrary-color.
            cardClassName,
          )}
          style={{
            "--tier-color": tier.color,
            boxShadow:
              done || isNextStep
                ? `inset 0 0 0 1.5px ${tier.color}`
                : "inset 0 0 0 1.5px var(--hairline)",
          } as React.CSSProperties}
        >
          {/* 3-col grid on desktop, vertical on mobile (414px would crush) */}
          <div className="grid grid-cols-[60px_1fr] md:grid-cols-[60px_1fr_auto] gap-5 items-center">
            {/* Tier-color tile — 60×60, radius 18, BLACK icon at 28px.
                Canonical pairs tier-color fills with black content
                (white-on-gold is 1.40 contrast → AA fail). */}
            <span
              aria-hidden
              className="w-15 h-15 rounded-[18px] flex items-center justify-center shrink-0"
              style={{ background: tier.color }}
            >
              <tier.Icon className="size-7 text-black" />
            </span>

            {/* Middle column — title + inline verified/soon label, sub, body */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-h2 text-(--ink) font-extrabold">
                  {tier.label}
                </h2>
                {done ? (
                  // Canonical: ✓ Verified inline in tier-color. --tier-color
                  // cascades from the Card style above.
                  <span
                    className="inline-flex items-center gap-1 text-caption font-bold"
                    style={{ color: tier.color }}
                  >
                    <Check size={14} strokeWidth={3} /> Verified
                  </span>
                ) : tier.soon ? (
                  <Pill variant="lavender" size="sm">Coming soon</Pill>
                ) : null}
              </div>
              <p className="text-caption text-(--ink-3) mt-0.5">{tier.sub}</p>
              <p className="text-meta text-(--ink-2) mt-2 leading-relaxed">
                {tier.body}
              </p>
            </div>

            {/* Right column — done shows "Completed" caption; otherwise a
                ghost outline button with tier-color border. Active step
                (the next undone tier) gets a 12% tier-tinted bg fill so
                it stands out as the recommended next action. Below md
                the button sits below (stacked) — see column-span. */}
            <div className="col-span-2 md:col-span-1 md:justify-self-end mt-3 md:mt-0">
              {done ? (
                <span className="text-caption text-(--ink-3)">Completed</span>
              ) : (
                <Link
                  href={`/verify/${tier.key}`}
                  prefetch={false}
                  className={cn(
                    "inline-flex items-center justify-center h-12 px-5.5 rounded-[14px] text-meta font-semibold whitespace-nowrap text-(--ink) border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-lavender) focus-visible:ring-offset-2",
                  )}
                  style={{
                    borderColor: tier.color,
                    background: isNextStep
                      ? `color-mix(in oklch, ${tier.color} 12%, transparent)`
                      : "transparent",
                  }}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          </div>
        </Card>
      );
      return (
        <motion.div
          key={tier.key}
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.06 + Math.min(i, 4) * 0.04 }}
        >
          {card}
        </motion.div>
      );
    });
  };

  const isDone = (key: string) =>
    (key === "bronze" && isBronzeDone) ||
    (key === "silver" && isSilverDone) ||
    (key === "gold" && isGoldDone);

  return (
    <PageShell bottomPad="default" desktopShell="sidebar" topBarTitle="Verification">
      {/* ── Mobile layout (hidden at md+) ─────────────────────────────── */}
      <div className="md:hidden">
        <PageHeader pad="tight" className="flex items-center gap-3">
          <BackButton fallback="/profile" label="Back to profile" />
          <PageHeaderTitle>Get verified</PageHeaderTitle>
        </PageHeader>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.4 }}
          className="px-5 pt-2 pb-4 text-meta text-(--ink-2)"
        >
          Verified profiles get more matches and signal you&apos;re a real person.
        </motion.p>

        <div className="flex flex-col gap-4 px-5">
          {tierCards(isDone)}
        </div>
      </div>

      {/* ── Desktop layout (hidden below md) ─────────────────────────── */}
      <div className="hidden md:grid md:grid-cols-[1fr_360px] md:gap-8 md:max-w-275 md:mx-auto md:w-full">
        {/* Left: subtitle + tier cards */}
        <div className="flex flex-col gap-4">
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.4 }}
            className="text-body text-(--ink-2)"
          >
            Verified profiles get more matches and signal you&apos;re a real person.
          </motion.p>
          {tierCards(isDone)}
        </div>

        {/* Right: why-verify context rail (canonical screens/12-verify.md
            "WHY VERIFY" panel — 3 stat rows + privacy note). Theme-aware
            tokens throughout (verbose `text-(--X,fallback)` syntax with
            inline OKLCH fallbacks dropped 2026-05-17 — the tokens are
            registered in :root/[data-theme="light"] so the fallback was
            redundant noise). */}
        <div className="flex flex-col gap-5 rounded-[22px] p-6 self-start border border-(--hairline) bg-(--card)">
          <h3 className="text-overline text-(--ink-2)">Why verify</h3>
          <div className="flex flex-col gap-0">
            {[
              { stat: "3.4×", label: "more matches for verified profiles" },
              { stat: "2.1×", label: "more replies to your messages" },
              { stat: "98%", label: "of Premium members are verified" },
            ].map(({ stat, label }, i, arr) => (
              <div
                key={stat}
                className={cn(
                  "flex flex-col gap-1 py-2.5",
                  i < arr.length - 1 && "border-b border-(--hairline)",
                )}
              >
                <span className="text-h2 font-extrabold text-(--ink) tabular-nums">
                  {stat}
                </span>
                <span className="text-caption text-(--ink-3)">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-caption text-(--ink-3) leading-relaxed">
            Government ID documents are held by Stripe Identity, not Ahavah. We never see your document.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
