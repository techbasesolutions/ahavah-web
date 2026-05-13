"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { BrandMark } from "@/components/brand/sparkle-mark";
import { PageShell } from "@/components/app/page-shell";
import { ApiError } from "@/lib/api-client";
import { requestEmailOtp } from "@/lib/auth-otp";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";

/**
 * Returning user flow. Single email field; no password. Submit triggers
 * /request-otp, then routes to /onboarding/verify-email (the same OTP-box
 * page used by sign-up). The /check-otp response includes `is_new_account`
 * which is used by verify-email to branch new vs. returning users.
 *
 * Mirrors sign-up's handler exactly so the auth surface area stays small.
 */

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = email.includes("@");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await requestEmailOtp(email);
      sessionStorage.setItem(PENDING_EMAIL_KEY, email);
      router.push("/onboarding/verify-email");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many requests. Try again in a few minutes.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("That email looks malformed. Check it and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <PageShell bottomPad="default" className="px-5 pt-6">
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25 }}
        className="flex justify-center pt-2"
      >
        <BrandMark size="md" />
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.07 }}
        className="mt-6 flex flex-col gap-2 text-center"
      >
        <h1 className="text-display text-white">
          Welcome back<span className="text-lime">.</span>
        </h1>
        <p className="text-body text-text-secondary">
          Enter your email and we&apos;ll send a sign-in code.
        </p>
      </motion.div>

      <motion.form
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.14 }}
        className="mt-8 flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-email" className="text-meta text-white">
            Email
          </Label>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            size="lg"
            tone="elevated"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {isComplete ? (
          <Button
            type="submit"
            size="cta"
            tone="cta"
            lift="float"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                Sending code...
              </>
            ) : (
              "Send code"
            )}
          </Button>
        ) : (
          <Button type="submit" variant="outlineSubtle" size="cta" disabled>
            Send code
          </Button>
        )}

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="text-center text-caption font-semibold text-pink"
          >
            {error}
          </p>
        ) : null}
      </motion.form>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.21 }}
        className="mt-6 flex items-center justify-center gap-2 text-meta text-text-secondary"
      >
        <span>New here?</span>
        <Button
          nativeButton={false}
          variant="link"
          size="tap"
          className="text-lavender"
          render={<Link href="/auth/sign-up" prefetch={false} />}
        >
          Create account
        </Button>
      </motion.div>
    </PageShell>
  );
}
