"use client";

import { Camera, BadgeCheck, Smartphone, Sun } from "lucide-react";

import { VerifyTierShell } from "@/components/app/verify-tier-shell";
import { useStartVerification } from "@/lib/use-start-verification";

export default function VerifyBronzePage() {
  // All three tiers (Bronze/Silver/Gold) currently route through the same
  // Stripe Identity session — the backend webhook decides what tier to
  // grant based on what Stripe approved. Bronze entry-point copy stays
  // light-touch; the underlying flow is the same.
  const { start, busy, errorMessage } = useStartVerification();
  return (
    <VerifyTierShell
      tierLabel="Bronze verification"
      tierColor="#CD7F32"
      HeroIcon={Smartphone}
      subline="Profile verified"
      description="A short selfie confirms you're a real person and matches your profile photos. Most people finish in under a minute."
      steps={[
        {
          Icon: Sun,
          title: "Find a well-lit spot",
          description:
            "Face a window or a lamp; avoid backlighting. Remove sunglasses or a hat.",
        },
        {
          Icon: Camera,
          title: "Tap to open the camera",
          description:
            "We need front-camera access. Revoke any time from Settings → Privacy.",
        },
        {
          Icon: BadgeCheck,
          title: "We cross-check your photos",
          description:
            "An on-device check confirms the selfie matches the photos on your profile.",
        },
      ]}
      ctaLabel="Open camera"
      onCtaClick={() => void start()}
      ctaBusy={busy}
      errorMessage={errorMessage}
      disclosure="The selfie is processed on-device. Only a yes/no result is stored on our server."
    />
  );
}
