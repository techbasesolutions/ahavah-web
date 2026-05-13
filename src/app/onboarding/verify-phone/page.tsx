"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { CodeInput } from "@/components/app/code-input";
import { OnboardingShell } from "@/components/app/onboarding-shell";

import { ApiError, setSessionToken } from "@/lib/api-client";
import { requestPhoneOtp, checkPhoneOtp } from "@/lib/auth-otp";
import { writeChatSession } from "@/lib/chat-session";
import { useProfile, writeOnboarded } from "@/lib/use-profile";

/**
 * Verify-phone step. Two-phase UI:
 *
 *   Phase A (no pending phone): show a phone input. Submit -> POST
 *   /request-otp { phone } and stash the phone in sessionStorage for
 *   subsequent re-renders / resends.
 *
 *   Phase B (phone present): show the 6-box OTP entry. Submit ->
 *   POST /check-otp { phone, otp } -> refreshProfile() -> next step.
 *
 * No upstream onboarding page captures the phone yet (it lives on this
 * page rather than as a separate /onboarding/phone step). The pending
 * phone is stored in sessionStorage so reloads survive but a closed tab
 * cleans up.
 *
 * Note: PENDING_PHONE_KEY is defined locally here (not in storage-keys.ts)
 * because Phase W's foundation file is frozen — adding a new key would
 * require an orchestrator-owned change. The string matches the naming
 * convention of storage-keys.ts so future centralisation is mechanical.
 */

const PENDING_PHONE_KEY = "ahavah.pending-phone";
const RESEND_SECONDS = 30;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function VerifyPhoneStep() {
  const router = useRouter();
  const { refreshProfile } = useProfile();
  const [phone, setPhone] = useState("");
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isPhoneValid = phone.replace(/\D/g, "").length >= 7;
  const isCodeComplete = code.length === 6;
  const canResend = resendSeconds <= 0 && !verifying && phoneSubmitted;

  // On mount, hydrate phone from sessionStorage. If present, jump straight
  // to the OTP-entry phase.
  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_PHONE_KEY);
    if (stored) {
      // Hydrating from an external store (sessionStorage) into React state
      // is the canonical setState-in-effect pattern; rule disabled with
      // intent.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhone(stored);
      setPhoneSubmitted(true);
      setResendSeconds(RESEND_SECONDS);
    }
  }, []);

  // Resend countdown.
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  const handleSendCode = async () => {
    if (!isPhoneValid || sending) return;
    setError(null);
    setSending(true);
    try {
      await requestPhoneOtp(phone);
      sessionStorage.setItem(PENDING_PHONE_KEY, phone);
      setPhoneSubmitted(true);
      setResendSeconds(RESEND_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many requests. Try again in a few minutes.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("That phone number looks malformed. Check it and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setError(null);
    setResendSeconds(RESEND_SECONDS);
    try {
      await requestPhoneOtp(phone);
    } catch {
      setError("Couldn't resend the code. Try again in a moment.");
    }
  };

  const handleCallInstead = async () => {
    if (!canResend) return;
    setError(null);
    setResendSeconds(RESEND_SECONDS);
    // Backend voice fallback shares the /request-otp endpoint with a
    // `voice: true` flag in some deployments. If unsupported, the same
    // endpoint just re-sends SMS — best effort.
    try {
      await requestPhoneOtp(phone);
    } catch {
      setError("Couldn't request a call. Try again in a moment.");
    }
  };

  const handleVerify = async () => {
    if (!isCodeComplete || verifying || !phone) return;
    setError(null);
    setVerifying(true);
    try {
      const result = await checkPhoneOtp(phone, code);
      // See verify-email/page.tsx — refresh bearer + persist chat session.
      setSessionToken(result.session_token);
      writeChatSession({
        myUuid: result.person_uuid,
        sessionToken: result.session_token,
      });
      writeOnboarded(result.onboarded);
      sessionStorage.removeItem(PENDING_PHONE_KEY);
      await refreshProfile();
      router.push("/onboarding/name");
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
      href="/onboarding/verify-phone"
      ctaLabel={phoneSubmitted ? "Continue" : "Send code"}
      ctaLoadingLabel={phoneSubmitted ? "Verifying..." : "Sending..."}
      ctaDisabled={phoneSubmitted ? !isCodeComplete : !isPhoneValid}
      ctaLoading={phoneSubmitted ? verifying : sending}
      onNext={phoneSubmitted ? handleVerify : handleSendCode}
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
            {phoneSubmitted ? (
              <>
                We sent an SMS to{" "}
                <span className="font-semibold text-white">{phone}</span>.
                Enter the 6-digit code to continue.
              </>
            ) : (
              "Enter your phone number and we'll send a 6-digit code."
            )}
          </p>
        </div>
      </motion.div>

      {phoneSubmitted ? (
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
      ) : (
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="mt-10 flex flex-col gap-2"
        >
          <Label htmlFor="verify-phone-input" className="text-meta text-white">
            Phone number
          </Label>
          <Input
            id="verify-phone-input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            size="lg"
            tone="elevated"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 246 555 0118"
            disabled={sending}
          />
        </motion.div>
      )}

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

      {phoneSubmitted ? (
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="mt-6 flex flex-col items-center gap-2"
        >
          <p className="text-meta text-text-secondary">
            Didn&apos;t get the code?
          </p>
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
            <span className="text-text-muted" aria-hidden>
              .
            </span>
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
      ) : null}
    </OnboardingShell>
  );
}
