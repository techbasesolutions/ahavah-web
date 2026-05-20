"use client";

import { IdCard, ScanFace, ShieldCheck } from "lucide-react";

import { VerifyTierShell } from "@/components/app/verify-tier-shell";
import { useStartVerification } from "@/lib/use-start-verification";

export default function VerifyGoldPage() {
  const { start, busy, errorMessage } = useStartVerification();
  return (
    <VerifyTierShell
      tierLabel="Gold verification"
      tierColor="#FFD700"
      HeroIcon={IdCard}
      subline="ID verified"
      description="We use Stripe Identity to verify a government-issued ID and match it to your face. Highest trust signal on Ahavah."
      steps={[
        {
          Icon: IdCard,
          title: "Have your government ID ready",
          description:
            "Driving licence, passport, or national ID. Stripe accepts most countries.",
        },
        {
          Icon: ScanFace,
          title: "Take a selfie inside the Stripe flow",
          description:
            "Stripe matches the selfie to the photo on your ID. No further action needed.",
        },
        {
          Icon: ShieldCheck,
          title: "Verified within minutes",
          description:
            "Your Gold badge unlocks once Stripe approves. Most checks finish in under five minutes.",
        },
      ]}
      ctaLabel="Continue with Stripe Identity"
      onCtaClick={() => void start()}
      ctaBusy={busy}
      errorMessage={errorMessage}
      disclosure="Your ID is processed by Stripe and never stored on Ahavah's servers. Only the result is saved."
    />
  );
}
