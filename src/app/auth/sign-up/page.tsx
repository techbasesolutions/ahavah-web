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

import { BrandMark } from "@/components/brand/sparkle-mark";
import { PageShell } from "@/components/app/page-shell";
import { ApiError } from "@/lib/api-client";
import { requestEmailOtp } from "@/lib/auth-otp";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";

const MIN_PASSWORD = 8;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Lightweight strength heuristic — counts presence of length, mixed case,
// digits, symbols. Returns a level 0–4 + label. NOT a security check; the
// real backend should enforce policy. The UI just gives the user a hint.
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

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  // If they're already signed in, don't show them a "Create account"
  // form — bounce to /discover.
  const { checking } = useRedirectIfSignedIn();

  // Prefill from the email the user already typed on the welcome page.
  // Without this, the user types their email on / then is prompted for it
  // again here — flagged as bad UX.
  useEffect(() => {
    const prefill = sessionStorage.getItem(PENDING_EMAIL_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefill) setEmail(prefill);
  }, []);
  // Password is captured locally for the strength meter only. Duolicious
  // auth is passwordless (email-OTP); /request-otp accepts only the email
  // field. The strength meter remains as a UX gate so users still feel they
  // are "creating an account", but no password is ever transmitted to the
  // backend. If the product later moves to password+OTP, send `password`
  // in the request body here.
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
      // Bridge to /onboarding/verify-email — that page reads this key to
      // know which email to verify against. sessionStorage (not local)
      // so a closed tab cleans up automatically.
      sessionStorage.setItem(PENDING_EMAIL_KEY, email);
      router.push("/onboarding/verify-email");
    } catch (err) {
      if (err instanceof ApiError && err.status === 461) {
        // Backend marked this account/email as banned (or in the
        // banned-club list). Route to the dedicated edge page instead
        // of a generic error — banned users deserve a clear answer.
        router.push("/banned");
        return;
      } else if (err instanceof ApiError && err.status === 460) {
        // IP blocked (firehol). Show /locked.
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
      <PageShell bottomPad="default" className="items-center justify-center px-5">
        <p className="text-body text-text-secondary">Signing you in…</p>
      </PageShell>
    );
  }

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
          Create your account<span className="text-lime">.</span>
        </h1>
        <p className="text-body text-text-secondary">
          We&apos;ll verify your email and phone in the next two steps.
        </p>
      </motion.div>

      <motion.form
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.14 }}
        className="mt-8 flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-email" className="text-meta text-white">
            Email
          </Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            size="lg"
            tone="elevated"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-password" className="text-meta text-white">
            Password
          </Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            size="lg"
            tone="elevated"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            aria-describedby="signup-password-help"
          />
          {/* 4-segment strength meter — segments fill as level increases.
              Lime for level 4 (Strong), success-green for 3 (Good), warning
              for 2 (Fair), pink for 1 (Weak/Too short). Hidden when empty
              so the field looks clean on first focus. Per accessibility skill,
              the label is also surfaced in the helper text below for SR users
              (pure-color signal would fail "color alone" rule). */}
          {password.length > 0 && (
            <div className="flex items-center gap-2">
              <div
                aria-hidden
                className="flex flex-1 gap-1"
              >
                {[1, 2, 3, 4].map((seg) => (
                  <span
                    key={seg}
                    className={
                      seg <= strength.level
                        ? strength.level === 4
                          ? "h-1 flex-1 rounded-full bg-lime"
                          : strength.level === 3
                          ? "h-1 flex-1 rounded-full bg-success"
                          : strength.level === 2
                          ? "h-1 flex-1 rounded-full bg-lavender"
                          : "h-1 flex-1 rounded-full bg-pink"
                        : "h-1 flex-1 rounded-full bg-white/10"
                    }
                  />
                ))}
              </div>
              <span
                aria-live="polite"
                aria-label={`Password strength: ${strength.label}`}
                className={
                  strength.level === 4
                    ? "text-caption font-semibold text-lime"
                    : strength.level === 3
                    ? "text-caption font-semibold text-success"
                    : strength.level === 2
                    ? "text-caption font-semibold text-lavender"
                    : "text-caption font-semibold text-pink"
                }
              >
                {strength.label}
              </span>
            </div>
          )}
          <p
            id="signup-password-help"
            className="text-caption text-text-secondary"
          >
            8+ characters. We&apos;ll prompt you for 2FA after sign-up.
          </p>
        </div>

        {/* Larger checkbox (size-5 = 20px) so the visual weight balances
            the multi-line caption text. The kit Checkbox primitive is
            size-4 (16px) by default — looked dwarfed next to 3 lines. */}
        <Label
          htmlFor="signup-terms"
          className="mt-2 flex cursor-pointer items-start gap-3 text-left"
        >
          <Checkbox
            id="signup-terms"
            tone="elevated"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-1 size-5"
          />
          <span className="text-caption leading-relaxed text-text-secondary">
            I&apos;m 18+, I accept the{" "}
            <Link
              href="/legal/terms"
              prefetch={false}
              className="font-semibold text-white underline"
            >
              Terms
            </Link>
            ,{" "}
            <Link
              href="/legal/privacy"
              prefetch={false}
              className="font-semibold text-white underline"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/community-guidelines"
              prefetch={false}
              className="font-semibold text-white underline"
            >
              Community Guidelines
            </Link>
            .
          </span>
        </Label>

        {/* CTA — when invalid, show as outlineSubtle (clearly NOT a
            primary action; reads as "not ready" rather than "broken").
            When valid, swap to lime CTA. Avoids the disabled-opacity
            grey-on-lime that previously read as a UI bug. */}
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
                Creating…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        ) : (
          <Button
            type="submit"
            variant="outlineSubtle"
            size="cta"
            disabled
          >
            Create account
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
        <span>Already have an account?</span>
        <Button
          nativeButton={false}
          variant="link"
          size="tap"
          className="text-lavender"
          render={<Link href="/auth/sign-in" prefetch={false} />}
        >
          Sign in
        </Button>
      </motion.div>
    </PageShell>
  );
}
