"use client";

// Public privacy-policy page. Same marketing rhythm as /terms + /faq,
// established in commit c0645b4. Same eslint rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";

const SECTIONS: ReadonlyArray<{ slug: string; heading: string; body: string }> = [
  {
    slug: "data-we-collect",
    heading: "Data we collect",
    body: "Account info you give us (email, name, DOB, gender, country), profile content (photos, bio, languages, observance), verification artifacts (selfie, optional ID via Stripe Identity), and product analytics (page views, app errors).",
  },
  {
    slug: "why",
    heading: "Why we collect it",
    body: "To run the service: show your profile, match you with compatible members, verify identity, prevent abuse, deliver chat, and bill subscriptions.",
  },
  {
    slug: "stripe",
    heading: "Stripe Identity (Gold tier)",
    body: "Government ID + face match is processed by Stripe. Your document stays with Stripe; we only receive a verified-or-not result. We don't store your ID image.",
  },
  {
    slug: "sharing",
    heading: "Who we share with",
    body: "Stripe (payments + Identity), our infrastructure providers (DigitalOcean, Vercel), email delivery (Resend). We don't sell your data. We don't share verification documents with other members.",
  },
  {
    slug: "retention",
    heading: "Retention",
    body: "Account data stays until you delete. Deletion is permanent within 30 days. Anonymized aggregate analytics may be retained beyond that.",
  },
  {
    slug: "rights",
    heading: "Your rights",
    body: "Access, correction, deletion, export. Email support@ahavah.app to exercise any of these; we'll respond within 30 days.",
  },
  {
    slug: "children",
    heading: "No under-18 use",
    body: "Ahavah is 18+. We don't knowingly collect data from minors. If you believe a minor has an account, email support@ahavah.app and we'll remove it.",
  },
  {
    slug: "changes",
    heading: "Changes",
    body: "Material changes are announced in-app or by email. Continued use after a change means you accept the new policy.",
  },
  {
    slug: "contact",
    heading: "Contact",
    body: "Privacy questions: support@ahavah.app.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <MarketingHeader
        cta={
          <Button
            tone="elevated"
            size="tap"
            render={<Link href="/auth/sign-up" prefetch={false} />}
            className="rounded-xl"
          >
            Sign up
          </Button>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-[760px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
            Legal
          </span>
          <h1
            className="m-0 text-(--ink) text-[clamp(36px,7vw,72px)]"
            style={{
              fontFamily: "var(--font-display)",
              lineHeight: 0.94,
              letterSpacing: "-0.025em",
              fontWeight: 400,
            }}
          >
            Privacy policy<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">
            What data we collect, why, and what you can do about it. Last updated 2026-05-19.
          </p>
        </header>

        <nav aria-label="Contents" className="flex flex-col gap-1.5 pb-2 border-b border-(--hairline)">
          {SECTIONS.map((s) => (
            <Link
              key={s.slug}
              href={`#${s.slug}`}
              className="text-sm font-medium text-(--ink-2) hover:text-(--color-lavender) transition-colors"
            >
              {s.heading}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.slug} id={s.slug} className="scroll-mt-20 flex flex-col gap-2">
              <h2 className="m-0 text-lg lg:text-xl font-bold text-(--ink) tracking-tight">
                {s.heading}
              </h2>
              <p className="m-0 text-base leading-[1.65] text-(--ink-2)">{s.body}</p>
            </section>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
