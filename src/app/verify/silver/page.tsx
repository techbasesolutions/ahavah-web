"use client";

import { ScanFace, Smartphone, Sparkles } from "lucide-react";

import { VerifyTierShell } from "@/components/app/verify-tier-shell";

export default function VerifySilverPage() {
  return (
    <VerifyTierShell
      tierLabel="Silver verification"
      tierColor="#C0C0C0"
      HeroIcon={ScanFace}
      subline="Liveness verified"
      description="A 5-second face-liveness check distinguishes you from a video or static photo. Your scan is processed on-device and never stored."
      steps={[
        {
          Icon: Smartphone,
          title: "Hold your phone at eye level",
          description:
            "Find a stable spot. Move your face into the on-screen oval.",
        },
        {
          Icon: ScanFace,
          title: "Follow the on-screen prompts",
          description:
            "Tilt or turn your head as guided — usually 3–5 simple movements.",
        },
        {
          Icon: Sparkles,
          title: "Verified in seconds",
          description:
            "Your Silver badge appears on your profile as soon as the check passes.",
        },
      ]}
      ctaLabel="Start liveness check"
      disclosure="Liveness frames are processed on-device. Nothing is stored or sent to our servers."
    />
  );
}
