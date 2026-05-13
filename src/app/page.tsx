"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { BrandMark } from "@/components/brand/sparkle-mark";
import { PageShell } from "@/components/app/page-shell";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";

const EMAIL_SUFFIXES = ["@gmail.com", "@proton.me", "@yahoo.com", "@hotmail.com", "@outlook.com"];

// Common entrance: fade up, GPU-only (transform + opacity), reduce-motion
// inherits from globals.css. Stagger via per-block `delay`.
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function WelcomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  // Suffix chip handler — append the suffix when input is empty / has no
  // @, replace the existing suffix when one is already present. Keeps
  // local-part typing intact.
  const applySuffix = (suffix: string) => {
    setEmail((prev) => {
      if (!prev || !prev.includes("@")) return prev + suffix;
      const local = prev.split("@")[0];
      return local + suffix;
    });
  };

  // Stash the typed email so /auth/sign-{up,in} can prefill it instead
  // of prompting again. PENDING_EMAIL_KEY is the same bridge sign-up
  // already uses for /onboarding/verify-email — single source of truth
  // for "what email did the user enter last."
  const goTo = (path: string) => {
    const trimmed = email.trim();
    if (trimmed) sessionStorage.setItem(PENDING_EMAIL_KEY, trimmed);
    router.push(path);
  };

  return (
    <PageShell bottomPad="default" className="px-5 pt-6">
      {/* Brand */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25 }}
        className="flex justify-center pt-2"
      >
        <BrandMark size="md" />
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
        <h1 className="text-display text-white">
          Find love
          <br />
          across borders<span className="text-lime">.</span>
        </h1>
        <p className="max-w-xs text-body leading-relaxed text-text-secondary">
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
              variant="outlineSubtle"
              size="tap"
              aria-label={`Use ${suffix}`}
              onClick={() => applySuffix(suffix)}
              className="border-lavender/40 px-2 text-meta text-lavender hover:bg-lavender/10"
            >
              {suffix}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* CTA + footer — Primary "Create account" (clear sign-up intent) +
          secondary "Sign in" link below. Splitting the prior "Sign Up or
          Sign In" CTA into two distinct affordances disambiguates the two
          flows for new vs returning users. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.21 }}
        className="mt-8 flex flex-col gap-3"
      >
        <Button
          size="cta"
          lift="float"
          onClick={() => goTo("/auth/sign-up")}
        >
          Create account
        </Button>
        <div className="flex items-center justify-center gap-2 text-meta text-text-secondary">
          <span>Already have an account?</span>
          <Button
            variant="link"
            size="tap"
            className="text-lavender"
            onClick={() => goTo("/auth/sign-in")}
          >
            Sign in
          </Button>
        </div>
        <p className="text-center text-caption leading-relaxed text-text-muted">
          By signing up you agree to our{" "}
          <Link
            href="/legal/terms"
            prefetch={false}
            className="font-semibold text-text-secondary underline"
          >
            Terms
          </Link>
          ,{" "}
          <Link
            href="/legal/privacy"
            prefetch={false}
            className="font-semibold text-text-secondary underline"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/community-guidelines"
            prefetch={false}
            className="font-semibold text-text-secondary underline"
          >
            Community Guidelines
          </Link>
          .
        </p>
      </motion.div>
    </PageShell>
  );
}
