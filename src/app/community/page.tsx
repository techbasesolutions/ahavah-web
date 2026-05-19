"use client";

// Public community-guidelines page. Same marketing rhythm as /terms +
// /privacy + /faq, established in commit c0645b4. Same eslint rationale
// as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";

const SECTIONS: ReadonlyArray<{ slug: string; heading: string; body: string }> = [
  {
    slug: "spirit",
    heading: "The spirit of it",
    body: "Ahavah exists so people seeking marriage in a faith-observant context can meet without the noise of mainstream apps. Behave like someone you'd want to date.",
  },
  {
    slug: "be-real",
    heading: "Be real",
    body: "One profile per person. Your photos must be you. Don't pose as someone else, don't use photos of someone else, don't lie about basic facts.",
  },
  {
    slug: "be-respectful",
    heading: "Be respectful",
    body: "Sexual harassment, slurs, hate speech, and threats are zero-tolerance. Differences in observance are not a debating contest. If someone says no, accept it.",
  },
  {
    slug: "no-solicit",
    heading: "No solicitation",
    body: "Ahavah isn't a marketplace. No promoting external products, services, OnlyFans, crypto, or recruiting into anything outside the platform.",
  },
  {
    slug: "no-minors",
    heading: "Adults only",
    body: "18+ only. Don't post photos of minors, don't engage anyone who appears to be under 18, don't share anything sexual involving minors. We report violations to authorities.",
  },
  {
    slug: "report",
    heading: "How to report",
    body: "Tap the kebab menu on any profile or chat to report or block. Or email admin@ahavah.app with details. We act on every report; bad-faith reports also count against you.",
  },
  {
    slug: "enforcement",
    heading: "Enforcement",
    body: "Outcomes range from a warning to permanent ban. We may take action without warning for severe violations (impersonation, threats, exploitation of minors, hate speech).",
  },
  {
    slug: "appeals",
    heading: "Appeals",
    body: "Disagree with an enforcement action? Email admin@ahavah.app with your account email and a brief explanation. A human will review.",
  },
  {
    slug: "contact",
    heading: "Contact",
    body: "Anything else: admin@ahavah.app.",
  },
];

export default function CommunityPage() {
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <MarketingHeader
        cta={
          <Button
            tone="elevated"
            size="tap"
            render={<Link href="/auth/sign-in" prefetch={false} />}
            className="rounded-xl"
          >
            Sign in
          </Button>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-[760px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
            Community
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
            Community guidelines<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">
            How we expect members to treat each other. Last updated 2026-05-19.
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
