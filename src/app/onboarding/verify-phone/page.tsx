"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import { CodeInput } from "@/components/app/code-input";
import { OnboardingShell } from "@/components/app/onboarding-shell";

const PHONE = "+1 (246) 555-0118";
const RESEND_SECONDS = 30;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function VerifyPhoneStep() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);

  const isComplete = code.length === 6;
  const canResend = resendSeconds <= 0 && !verifying;

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  const handleResend = () => {
    setResendSeconds(RESEND_SECONDS);
    // Real implementation would POST to /auth/resend-sms-otp here.
  };

  const handleCallInstead = () => {
    setResendSeconds(RESEND_SECONDS);
    // Real implementation would POST to /auth/voice-call-otp here.
  };

  const handleVerify = () => {
    if (!isComplete || verifying) return;
    setVerifying(true);
    setTimeout(() => {
      router.push("/onboarding/name");
    }, 600);
  };

  return (
    <OnboardingShell
      step={2}
      totalSteps={14}
      back="/onboarding/verify-email"
      next="/onboarding/name"
      ctaLabel="Continue"
      ctaLoadingLabel="Verifying…"
      ctaDisabled={!isComplete}
      ctaLoading={verifying}
      onNext={handleVerify}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <IconBadge tone="brand" size="2xl" shape="circle">
          <Phone />
        </IconBadge>
        <div className="flex max-w-sm flex-col gap-2">
          <h1 className="text-display text-white">
            Verify your phone<span className="text-lime">.</span>
          </h1>
          <p className="text-body text-text-secondary">
            We sent an SMS to{" "}
            <span className="font-semibold text-white">{PHONE}</span>. Enter
            the 6-digit code to continue.
          </p>
        </div>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-10"
      >
        <CodeInput
          length={6}
          value={code}
          onValueChange={setCode}
          disabled={verifying}
        />
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-6 flex flex-col items-center gap-2"
      >
        <p className="text-meta text-text-secondary">Didn&apos;t get the code?</p>
        <div className="flex items-center gap-3">
          <Button
            variant="link"
            size="tap"
            className="text-lavender"
            disabled={!canResend}
            onClick={handleResend}
          >
            {resendSeconds > 0
              ? `Resend SMS in ${resendSeconds}s`
              : "Resend SMS"}
          </Button>
          <span className="text-text-muted" aria-hidden>·</span>
          <Button
            variant="link"
            size="tap"
            className="text-lavender"
            disabled={!canResend}
            onClick={handleCallInstead}
          >
            Call me instead
          </Button>
        </div>
      </motion.div>
    </OnboardingShell>
  );
}
