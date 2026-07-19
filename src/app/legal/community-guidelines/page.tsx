"use client";

// Public community-guidelines page. Same marketing rhythm as /privacy +
// /terms + /faq (non-auth, MarketingHeader + MarketingFooter). No session
// gate — these guidelines are linked from the public landing. Same eslint
// rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";

const SECTIONS: ReadonlyArray<{ slug: string; heading: string; body: string }> = [
  {
    slug: "be-kind",
    heading: "Be kind",
    body: "Treat every person as if you might match with them tomorrow. Harassment, hate speech, slurs, and unwanted sexual content are not tolerated and result in an immediate ban.",
  },
  {
    slug: "be-real",
    heading: "Be real",
    body: "Use real photos of yourself, your real first name, and your real age. No filters that obscure your face. No catfishing. Verification is optional but encouraged.",
  },
  {
    slug: "be-modest",
    heading: "Be modest",
    body: "Dress and present yourself modestly, in line with Torah values. No revealing or tight clothing, no cleavage, no exposed midriff, and nothing suggestive. Your face must be clearly visible. Photos that do not meet these standards will be removed.",
  },
  {
    slug: "be-safe",
    heading: "Be safe",
    body: "Take new conversations off-platform when you choose, never because someone pressures you. Never send money. Report anything that feels off using the menu in chat or on a profile.",
  },
  {
    slug: "if-you-see-something",
    heading: "If you see something",
    body: "Use the report flow. Reports reach a real human on our moderation team, and we review every one.",
  },
  {
    slug: "contact",
    heading: "Contact",
    body: "Questions about these guidelines: support@ahavah.app.",
  },
];

export default function CommunityGuidelinesPage() {
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
            Ahavah is a small, intentional community for believers seriously seeking marriage. The short version, with the full guidelines below.
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
