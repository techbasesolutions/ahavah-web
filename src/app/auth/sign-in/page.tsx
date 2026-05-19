"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Logo } from "@/components/brand/logo";
import { PageShell } from "@/components/app/page-shell";
import { AuthIllustration } from "@/components/app/auth-illustration";
import { ApiError } from "@/lib/api-client";
import { requestEmailOtp } from "@/lib/auth-otp";
import { AUTH_NEXT_URL_KEY, PENDING_EMAIL_KEY } from "@/lib/storage-keys";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";

/**
 * Sign-in has no dedicated canonical screen — mirrors sign-up's 5fr/7fr
 * split shell for auth-surface consistency. Form is single email field
 * (OTP-only), no password.
 */

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type FormProps = {
  email: string;
  setEmail: (v: string) => void;
  submitting: boolean;
  error: string | null;
  isComplete: boolean;
  onSubmit: (e: React.FormEvent) => void;
  variant: "mobile" | "desktop";
};

function SignInForm({
  email,
  setEmail,
  submitting,
  error,
  isComplete,
  onSubmit,
  variant,
}: FormProps) {
  const idPrefix = variant === "desktop" ? "d-signin" : "signin";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-email`} className="text-caption text-(--ink-2)">
          Email
        </Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          autoComplete="email"
          size="lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="bg-(--app)"
        />
      </div>

      <Button
        type="submit"
        size="cta"
        tone="cta"
        lift={isComplete && !submitting ? "float" : "none"}
        disabled={!isComplete || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin" />
            Sending code…
          </>
        ) : (
          "Send code"
        )}
      </Button>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-center text-caption font-semibold text-(--color-pink)"
        >
          {error}
        </p>
      )}
    </form>
  );
}

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { checking } = useRedirectIfSignedIn();

  useEffect(() => {
    const prefill = sessionStorage.getItem(PENDING_EMAIL_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefill) setEmail(prefill);

    // Capture ?next= so the post-OTP redirect in /onboarding/verify-email
    // can land the user back at the route they were trying to reach.
    // Constrain to same-origin paths to prevent open-redirect abuse.
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      sessionStorage.setItem(AUTH_NEXT_URL_KEY, next);
    }
  }, [searchParams]);

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
      if (err instanceof ApiError && err.status === 461) {
        router.push("/banned");
        return;
      } else if (err instanceof ApiError && err.status === 460) {
        router.push("/locked");
        return;
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Too many requests. Try again in a few minutes.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("That email looks malformed. Check it and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <PageShell
        desktopShell="full-bleed"
        bottomPad="default"
        className="items-center justify-center px-5"
      >
        <p className="text-body text-(--ink-2)">Signing you in…</p>
      </PageShell>
    );
  }

  const formProps = {
    email,
    setEmail,
    submitting,
    error,
    isComplete,
    onSubmit: handleSubmit,
  };

  return (
    <PageShell desktopShell="full-bleed" bottomPad="default" className="min-h-dvh">
      {/* ── DESKTOP (≥md) — mirrors sign-up split shell ─────────────── */}
      <div className="hidden md:grid md:grid-cols-[5fr_7fr] md:min-h-dvh">
        <div className="bg-(--card) p-14 lg:p-16 flex flex-col gap-6">
          <Logo variant="horizontal" size="md" priority />
          <div className="flex-1 flex flex-col justify-center gap-4.5 max-w-105">
            <div>
              <h1 className="text-display-lg font-extrabold leading-tight tracking-tight text-(--ink) m-0">
                Welcome back<span className="text-(--color-lime)">.</span>
              </h1>
              <p className="mt-2.5 text-meta text-(--ink-2)">
                Enter your email and we&apos;ll send a sign-in code.
              </p>
            </div>
            <SignInForm {...formProps} variant="desktop" />
            <div className="flex items-center justify-start gap-2 text-meta text-(--ink-2)">
              <span>New here?</span>
              <Link
                href="/auth/sign-up"
                prefetch={false}
                className="font-semibold text-(--color-lavender) underline-offset-2 hover:underline"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
        <AuthIllustration />
      </div>

      {/* ── MOBILE (<md) ────────────────────────────────────────────── */}
      <div className="md:hidden px-5 pt-6 flex flex-col">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25 }}
          className="flex justify-center pt-2"
        >
          <Logo variant="horizontal" size="md" priority />
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.07 }}
          className="mt-6 flex flex-col gap-2 text-center"
        >
          <h1 className="text-display text-(--ink)">
            Welcome back<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-body text-(--ink-2)">
            Enter your email and we&apos;ll send a sign-in code.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.14 }}
          className="mt-8"
        >
          <SignInForm {...formProps} variant="mobile" />
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.21 }}
          className="mt-6 mb-8 flex items-center justify-center gap-2 text-meta text-(--ink-2)"
        >
          <span>New here?</span>
          <Link
            href="/auth/sign-up"
            prefetch={false}
            className="font-semibold text-(--color-lavender)"
          >
            Create account
          </Link>
        </motion.div>
      </div>
    </PageShell>
  );
}

// useSearchParams() must be inside a Suspense boundary in Next 16
// when used in a client-rendered page; otherwise build fails with
// "useSearchParams() should be wrapped in a suspense boundary".
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageContent />
    </Suspense>
  );
}
