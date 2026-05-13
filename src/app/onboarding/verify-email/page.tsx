"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import { CodeInput } from "@/components/app/code-input";
import { OnboardingShell } from "@/components/app/onboarding-shell";

import { ApiError } from "@/lib/api-client";
import { checkOtp, requestEmailOtp } from "@/lib/auth-otp";
import { writeChatSession } from "@/lib/chat-session";
import { useProfile, writeOnboarded } from "@/lib/use-profile";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";

/**
 * Verify-email step. Receives the email via `sessionStorage[PENDING_EMAIL_KEY]`
 * (set by /auth/sign-up or /auth/sign-in). On code completion:
 *
 *   1. POST /check-otp { email, otp }
 *   2. Server sets `duo_session` as an httpOnly cookie (Set-Cookie header).
 *      api-client.ts has `credentials: 'include'` so it travels on every
 *      subsequent request.
 *   3. refreshProfile() rehydrates client state from GET /me using the new
 *      cookie.
 *   4. Branch: `is_new_account` -> /onboarding/name (start onboarding wizard);
 *      otherwise -> /discover (returning user).
 *
 * Dev OTP: emails to *@example.com use OTP code `000000` (backend dev
 * shortcut, useful for smoke walks without a real inbox).
 */

const RESEND_SECONDS = 30;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function VerifyEmailStep() {
  const router = useRouter();
  const { refreshProfile } = useProfile();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const isComplete = code.length === 6;

  // Pull the pending email on mount. Missing email means the user landed
  // here directly without going through sign-up/sign-in — kick them back
  // so they don't sit on a dead-end screen.
  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_EMAIL_KEY);
    if (!stored) {
      router.replace("/auth/sign-up");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(stored);
  }, [router]);

  // Resend countdown — decrement once per second until 0.
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  const handleResend = async () => {
    if (!email || resendSeconds > 0 || verifying) return;
    setError(null);
    setResendSeconds(RESEND_SECONDS);
    try {
      await requestEmailOtp(email);
    } catch {
      // If resend fails the countdown still ran; show a soft error so the
      // user knows nothing was sent.
      setError("Couldn't resend the code. Try again in a moment.");
    }
  };

  const handleVerify = async () => {
    if (!isComplete || verifying || !email) return;
    setError(null);
    setVerifying(true);
    try {
      const result = await checkOtp(email, code);
      // /check-otp does NOT return session_token (only /request-otp does).
      // requestEmailOtp already persisted the bearer; we just need to
      // record the user's uuid for the chat WebSocket SASL flow.
      writeChatSession({ myUuid: result.person_uuid });
      // Record onboarding status so useProfile routes PATCHes correctly
      // (/onboardee-info for onboardees, /profile-info for full members).
      writeOnboarded(result.onboarded);
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
      await refreshProfile();
      if (result.is_new_account) {
        router.push("/onboarding/name");
      } else {
        router.push("/discover");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("That code didn't match. Try again.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Too many attempts. Try again in a few minutes.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setVerifying(false);
    }
  };

  return (
    <OnboardingShell
      href="/onboarding/verify-email"
      ctaLabel="Continue"
      ctaLoadingLabel="Verifying..."
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
            <span className="font-semibold text-white">
              {email ?? "your email"}
            </span>
            . Enter it below to confirm your address.
          </p>
        </div>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="mt-10"
      >
        <CodeInput
          length={6}
          value={code}
          onValueChange={setCode}
          disabled={verifying}
        />
      </motion.div>

      {error ? (
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.2 }}
          role="alert"
          aria-live="polite"
          className="mt-4 text-center text-caption font-semibold text-pink"
        >
          {error}
        </motion.p>
      ) : null}

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="mt-6 flex flex-col items-center gap-2"
      >
        <p className="text-meta text-text-secondary">
          Didn&apos;t get the code?
        </p>
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
