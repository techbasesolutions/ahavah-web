"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Logo } from "@/components/brand/logo";
import { PageShell } from "@/components/app/page-shell";
import { AuthIllustration } from "@/components/app/auth-illustration";
import { ApiError } from "@/lib/api-client";
import { requestEmailOtp } from "@/lib/auth-otp";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";

const MIN_PASSWORD = 8;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3 | 4; label: string } {
  if (pw.length === 0) return { level: 0, label: "" };
  if (pw.length < MIN_PASSWORD) return { level: 1, label: "Too short" };
  let score = 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score = Math.min(4, score + 1);
  const label =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  return { level: score as 1 | 2 | 3 | 4, label };
}

type FormProps = {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  submitting: boolean;
  error: string | null;
  isComplete: boolean;
  onSubmit: (e: React.FormEvent) => void;
  strength: { level: 0 | 1 | 2 | 3 | 4; label: string };
  variant: "mobile" | "desktop";
};

function SignUpForm({
  email,
  setEmail,
  password,
  setPassword,
  accepted,
  setAccepted,
  submitting,
  error,
  isComplete,
  onSubmit,
  strength,
  variant,
}: FormProps) {
  const isDesktop = variant === "desktop";
  const idPrefix = isDesktop ? "d-signup" : "signup";
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

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-password`} className="text-caption text-(--ink-2)">
          Password
        </Label>
        <Input
          id={`${idPrefix}-password`}
          type="password"
          autoComplete="new-password"
          size="lg"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          aria-describedby={`${idPrefix}-password-help`}
          className="bg-(--app)"
        />
        {password.length > 0 && (
          <div className="flex items-center gap-2">
            <div aria-hidden className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((seg) => (
                <span
                  key={seg}
                  className={
                    seg <= strength.level
                      ? strength.level >= 3
                        ? "h-1.5 flex-1 rounded-full bg-(--color-lime)"
                        : strength.level === 2
                        ? "h-1.5 flex-1 rounded-full bg-(--color-lavender)"
                        : "h-1.5 flex-1 rounded-full bg-(--color-pink)"
                      : "h-1.5 flex-1 rounded-full bg-(--hairline)"
                  }
                />
              ))}
            </div>
            <span
              aria-live="polite"
              aria-label={`Password strength: ${strength.label}`}
              className={
                strength.level >= 3
                  ? "text-caption font-semibold text-(--color-lime)"
                  : strength.level === 2
                  ? "text-caption font-semibold text-(--color-lavender)"
                  : "text-caption font-semibold text-(--color-pink)"
              }
            >
              {strength.label}
            </span>
          </div>
        )}
        <p id={`${idPrefix}-password-help`} className="text-caption text-(--ink-3)">
          8+ characters. We&apos;ll prompt you for 2FA after sign-up.
        </p>
      </div>

      <Label
        htmlFor={`${idPrefix}-terms`}
        className="mt-1 flex cursor-pointer items-start gap-3 text-left"
      >
        <Checkbox
          id={`${idPrefix}-terms`}
          checked={accepted}
          onCheckedChange={(v) => setAccepted(v === true)}
          className="mt-0.5 size-5"
        />
        <span className="text-caption leading-relaxed text-(--ink-2)">
          I&apos;m 18+, I accept the{" "}
          <Link href="/legal/terms" prefetch={false} className="font-semibold text-(--ink) underline">
            Terms
          </Link>
          ,{" "}
          <Link href="/legal/privacy" prefetch={false} className="font-semibold text-(--ink) underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/community-guidelines"
            prefetch={false}
            className="font-semibold text-(--ink) underline"
          >
            Community Guidelines
          </Link>
          .
        </span>
      </Label>

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
          "Send me a code"
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

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const { checking } = useRedirectIfSignedIn();

  useEffect(() => {
    const prefill = sessionStorage.getItem(PENDING_EMAIL_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefill) setEmail(prefill);
  }, []);

  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const isComplete =
    email.includes("@") && password.length >= MIN_PASSWORD && accepted;

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
    password,
    setPassword,
    accepted,
    setAccepted,
    submitting,
    error,
    isComplete,
    onSubmit: handleSubmit,
    strength,
  };

  return (
    <PageShell desktopShell="full-bleed" bottomPad="default" className="min-h-dvh">
      {/* ── DESKTOP (≥md) — canonical 5fr/7fr split per 02-sign-up.md ── */}
      <div className="hidden md:grid md:grid-cols-[5fr_7fr] md:min-h-dvh">
        <div className="bg-(--card) p-14 lg:p-16 flex flex-col gap-6">
          <Logo variant="horizontal" size="md" priority />
          <div className="flex-1 flex flex-col justify-center gap-4.5 max-w-105">
            <div>
              <h1 className="text-display-lg font-extrabold leading-tight tracking-tight text-(--ink) m-0">
                Create your account
                <span className="text-(--color-lime)">.</span>
              </h1>
              <p className="mt-2.5 text-meta text-(--ink-2)">
                We&apos;ll email you a 6-digit code to sign in.
              </p>
            </div>
            <SignUpForm {...formProps} variant="desktop" />
            <div className="flex items-center justify-start gap-2 text-meta text-(--ink-2)">
              <span>Already have an account?</span>
              <Link
                href="/auth/sign-in"
                prefetch={false}
                className="font-semibold text-(--color-lavender) underline-offset-2 hover:underline"
              >
                Sign in
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
            Create your account<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-body text-(--ink-2)">
            We&apos;ll email you a 6-digit code to sign in.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.14 }}
          className="mt-8"
        >
          <SignUpForm {...formProps} variant="mobile" />
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.21 }}
          className="mt-6 mb-8 flex items-center justify-center gap-2 text-meta text-(--ink-2)"
        >
          <span>Already have an account?</span>
          <Link
            href="/auth/sign-in"
            prefetch={false}
            className="font-semibold text-(--color-lavender)"
          >
            Sign in
          </Link>
        </motion.div>
      </div>
    </PageShell>
  );
}
