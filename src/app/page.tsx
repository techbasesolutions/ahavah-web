"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { SparkleMark } from "@/components/brand/sparkle-mark";
import { Logo } from "@/components/brand/logo";
import { PageShell } from "@/components/app/page-shell";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import { requestEmailOtp } from "@/lib/auth-otp";

const EMAIL_SUFFIXES = ["@gmail.com", "@proton.me", "@yahoo.com", "@hotmail.com", "@outlook.com"];

// Common entrance: fade up, GPU-only (transform + opacity), reduce-motion
// inherits from globals.css. Stagger via per-block `delay`.
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// ── Desktop welcome — 7fr / 5fr split ─────────────────────────────────────
// Decorative sparkle positions + colors match 01-welcome.md spec.
// opacity-45 = 0.45 per the reference JSX.
const DESKTOP_SPARKLES = [
  { cls: "absolute left-20 top-[420px]", size: 52, color: "#D7FF81" },
  { cls: "absolute left-[420px] top-[180px]", size: 40, color: "#BC96FF" },
  { cls: "absolute left-[640px] top-[520px]", size: 32, color: "#FF4566" },
] as const;

const STATS = [
  { value: "12,400+", label: "verified profiles" },
  { value: "63",      label: "countries served" },
  { value: "3,200+",  label: "ongoing chats" },
] as const;

// Desktop right panel — email form extracted as a sub-component so it shares
// email state with the mobile form via lifted state.
function DesktopRightPanel({
  email,
  setEmail,
  onSubmit,
  submitting,
  goToSignIn,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  goToSignIn: () => void;
}) {
  const applySuffix = (suffix: string) => {
    setEmail(
      email && email.includes("@")
        ? email.split("@")[0] + suffix
        : email + suffix,
    );
  };

  return (
    // bg-card resolves to #FFFFFF in light mode; border-l uses --hairline via border-(--hairline)
    <div className="flex flex-col justify-center gap-6 border-l border-(--hairline) bg-card p-14">
      {/* Overline — text-overline typography: 11px / 700 / 0.08em */}
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Start here
      </p>

      {/* Heading block */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground">
          Create your account
        </h2>
        <p className="text-sm leading-snug text-muted-foreground">
          We&apos;ll email you a 6-digit code. No password to remember.
        </p>
      </div>

      {/* Email form */}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {/* Email input — 56px (h-input via size="lg"), lavender border */}
        <Input
          type="email"
          size="lg"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-(--color-lavender) bg-(--app) text-foreground focus-visible:border-(--color-lavender)"
        />

        {/* Provider chip grid — 5 cols, 40px tap height each */}
        <div className="grid grid-cols-5 gap-2">
          {EMAIL_SUFFIXES.map((suffix) => (
            <button
              key={suffix}
              type="button"
              aria-label={`Use ${suffix}`}
              onClick={() => applySuffix(suffix)}
              className="flex h-10 min-w-0 items-center justify-center truncate rounded-[10px] border border-[color-mix(in_oklch,var(--color-lavender)_50%,transparent)] px-1 text-xs font-medium text-(--color-lavender) transition-colors hover:bg-[color-mix(in_oklch,var(--color-lavender)_10%,transparent)]"
            >
              {suffix}
            </button>
          ))}
        </div>

        {/* Primary CTA */}
        <Button
          type="submit"
          size="cta"
          tone="cta"
          disabled={!email.includes("@") || submitting}
          className="mt-1"
        >
          {submitting ? "Sending…" : "Send me a code"}
        </Button>
      </form>

      {/* Sign-in link */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={goToSignIn}
          className="font-semibold text-(--color-lavender) underline-offset-2 hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // If the visitor already has a valid session, skip the welcome
  // screen entirely and go straight to /discover. Without this the
  // user has to retype their email + redo the OTP every time they
  // open the app, which feels like "re-onboarding" even though their
  // account is already set up.
  const { checking } = useRedirectIfSignedIn();

  // Suffix chip handler — append the suffix when input is empty / has no
  // @, replace the existing suffix when one is already present.
  const applySuffix = (suffix: string) => {
    setEmail((prev) => {
      if (!prev || !prev.includes("@")) return prev + suffix;
      const local = prev.split("@")[0];
      return local + suffix;
    });
  };

  // Stash the typed email so /auth/sign-{up,in} can prefill it instead
  // of prompting again.
  const goTo = (path: string) => {
    const trimmed = email.trim();
    if (trimmed) sessionStorage.setItem(PENDING_EMAIL_KEY, trimmed);
    router.push(path);
  };

  const goToSignIn = () => goTo("/auth/sign-in");

  // Desktop: submit OTP request directly from the welcome right panel.
  const handleDesktopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed.includes("@") || submitting) return;
    setSubmitting(true);
    try {
      await requestEmailOtp(trimmed);
      sessionStorage.setItem(PENDING_EMAIL_KEY, trimmed);
      router.push("/onboarding/verify-email");
    } catch {
      // On error fall through to sign-up page where errors are surfaced
      sessionStorage.setItem(PENDING_EMAIL_KEY, trimmed);
      router.push("/auth/sign-up");
    } finally {
      setSubmitting(false);
    }
  };

  // While probing /me, render a minimal placeholder so we don't
  // briefly flash the welcome screen to someone who's already signed in.
  if (checking) {
    return (
      <PageShell desktopShell="full-bleed" bottomPad="default" className="items-center justify-center px-5">
        <p className="text-body text-(--ink-2)">Signing you in…</p>
      </PageShell>
    );
  }

  return (
    <>
      {/* ── DESKTOP layout (≥md) ── hidden on mobile ───────────────────── */}
      {/*
        Left (7fr):
          - gradient bg: linear-gradient(135deg, var(--app) → lavender-mix)
          - BrandMark top-left, hero headline, stat row, footer absolute bottom
          - 3 decorative sparkles absolutely positioned
        Right (5fr):
          - bg-card, border-l hairline, email form
      */}
      <div className="welcome-desktop-grid hidden md:grid md:min-h-dvh">
        {/* LEFT — brand statement */}
        <div className="welcome-left-gradient relative flex flex-col justify-between overflow-hidden p-14">
          {/* Decorative sparkles — absolute, aria-hidden */}
          {DESKTOP_SPARKLES.map((sp, i) => (
            <span
              key={i}
              className={`pointer-events-none opacity-45 ${sp.cls}`}
              aria-hidden
            >
              <SparkleMark size={sp.size} color={sp.color} />
            </span>
          ))}

          {/* Brand mark — top-left (position: relative keeps it above sparkles) */}
          <div className="relative z-10">
            <Logo variant="horizontal" size="lg" priority />
          </div>

          {/* Hero copy block */}
          <div className="relative z-10 max-w-135">
            {/*
              text-marketing = 80px / 0.95 lh / -0.03em / 800 weight
              Not a Tailwind utility — using arbitrary values to match the spec exactly.
            */}
            <h1 className="m-0 text-marketing font-extrabold leading-none tracking-tighter text-foreground">
              Find love
              <br />
              across borders
              <span className="text-(--color-lime)">.</span>
            </h1>

            <p className="mt-6 max-w-115 text-xl leading-relaxed text-muted-foreground">
              Verified profiles, 100+ languages, real connections.
              Built for Torah-observant singles who don&apos;t fit anywhere else.
            </p>

            {/* Stat row — 3 cells, gap-6 */}
            <div className="mt-9 flex gap-6">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <div className="text-xl font-bold leading-tight tracking-tight text-foreground">
                    {value}
                  </div>
                  <div className="text-xs leading-snug text-(--ink-3)">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer — absolute bottom-left per spec */}
          <p className="relative z-10 text-xs text-(--ink-3)">
            &copy; 2026 Ahavah &mdash; Made for the diaspora.
          </p>
        </div>

        {/* RIGHT — sign-up form */}
        <DesktopRightPanel
          email={email}
          setEmail={setEmail}
          onSubmit={handleDesktopSubmit}
          submitting={submitting}
          goToSignIn={goToSignIn}
        />
      </div>

      {/* ── MOBILE layout (<md) ── existing code, untouched ───────────── */}
      <PageShell desktopShell="full-bleed" bottomPad="default" className="px-5 pt-6 md:hidden">
        {/* Brand */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25 }}
          className="flex justify-center pt-2"
        >
          <Logo variant="horizontal" size="md" priority />
        </motion.div>

        {/* Hero — display headline + supporting line, vertically centered.
            The lime period on the headline gives the brand promise a sharp
            typographic accent. No decorative stickers per established
            "no stickers on welcome / from the design kit" rule. */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.07 }}
          className="flex flex-1 flex-col items-center justify-center gap-4 px-2 text-center"
        >
          <h1 className="text-display text-(--ink)">
            Find love
            <br />
            across borders<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="max-w-xs text-body leading-relaxed text-(--ink-2)">
            Connect with people from anywhere, in any language.
          </p>
        </motion.div>

        {/* Email composer + provider chips */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.14 }}
          className="flex flex-col gap-3"
        >
          <Input
            type="email"
            size="lg"
            tone="elevated"
            placeholder="Enter your email to begin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {/* Suffix chips — interactive Buttons (44px tap target), not Badges.
              Click appends/replaces the suffix in the email input. Grid (3 cols)
              avoids the 2/2/1 orphan that flex-wrap produces with 5 chips at
              44px height. Last row has 2 chips spanning naturally. */}
          <div className="grid grid-cols-3 gap-2">
            {EMAIL_SUFFIXES.map((suffix) => (
              <Button
                key={suffix}
                type="button"
                variant="outline"
                size="tap"
                aria-label={`Use ${suffix}`}
                onClick={() => applySuffix(suffix)}
                className="border-(--color-lavender)/40 px-2 text-meta text-(--color-lavender) hover:bg-(--color-lavender)/10"
              >
                {suffix}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* CTA + footer */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.21 }}
          className="mt-8 flex flex-col gap-3"
        >
          <Button
            size="cta"
            tone="cta"
            lift="float"
            onClick={() => goTo("/auth/sign-up")}
          >
            Create account
          </Button>
          <div className="flex items-center justify-center gap-2 text-meta text-(--ink-2)">
            <span>Already have an account?</span>
            <Button
              variant="link"
              size="tap"
              className="text-(--color-lavender)"
              onClick={() => goTo("/auth/sign-in")}
            >
              Sign in
            </Button>
          </div>
          <Button
            variant="link"
            size="tap"
            className="self-center text-(--ink-3)"
            onClick={() => goTo("/onboarding")}
          >
            Take the tour
          </Button>
          <p className="text-center text-caption leading-relaxed text-(--ink-3)">
            By signing up you agree to our{" "}
            <Link
              href="/legal/terms"
              prefetch={false}
              className="font-semibold text-(--ink-2) underline"
            >
              Terms
            </Link>
            ,{" "}
            <Link
              href="/legal/privacy"
              prefetch={false}
              className="font-semibold text-(--ink-2) underline"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/community-guidelines"
              prefetch={false}
              className="font-semibold text-(--ink-2) underline"
            >
              Community Guidelines
            </Link>
            .
          </p>
        </motion.div>
      </PageShell>
    </>
  );
}
