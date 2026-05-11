"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import { CodeInput } from "@/components/app/code-input";
import { OnboardingShell } from "@/components/app/onboarding-shell";

const EMAIL = "ehud@example.com";
const RESEND_SECONDS = 30;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function VerifyEmailStep() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);

  const isComplete = code.length === 6;

  // Countdown — decrement once per second until 0. Reset by clicking
  // Resend (which would re-fire the send call in production).
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  const handleResend = () => {
    setResendSeconds(RESEND_SECONDS);
    // Real implementation would POST to /auth/resend-email-otp here.
  };

  const handleVerify = () => {
    if (!isComplete || verifying) return;
    setVerifying(true);
    // Stubbed verification — real flow checks the code against the
    // backend, then routes on success or shows an error on failure.
    setTimeout(() => {
      router.push("/onboarding/verify-phone");
    }, 600);
  };

  return (
    <OnboardingShell
      step={1}
      totalSteps={10}
      next="/onboarding/verify-phone"
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
          <Mail />
        </IconBadge>
        <div className="flex max-w-sm flex-col gap-2">
          <h1 className="text-display text-white">
            Check your email<span className="text-lime">.</span>
          </h1>
          <p className="text-body text-text-secondary">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-white">{EMAIL}</span>. Enter it
            below to confirm your address.
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
        <Button
          variant="link"
          size="tap"
          className="text-lavender"
          disabled={resendSeconds > 0 || verifying}
          onClick={handleResend}
        >
          {resendSeconds > 0
            ? `Resend in ${resendSeconds}s`
            : "Resend code"}
        </Button>
      </motion.div>
    </OnboardingShell>
  );
}
