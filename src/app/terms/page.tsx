"use client";

// Public terms-of-service page. Pixel-precise marketing rhythm matches
// the landing-page design system established in commit c0645b4. Same
// rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";

const SECTIONS: ReadonlyArray<{ slug: string; heading: string; body: string }> = [
  {
    slug: "acceptance",
    heading: "Acceptance of terms",
    body: "By creating an account or joining the waitlist you agree to these terms. If you don't agree, please don't use Ahavah.",
  },
  {
    slug: "eligibility",
    heading: "Eligibility",
    body: "You must be at least 18 years old. You're responsible for the accuracy of the information you give us.",
  },
  {
    slug: "account",
    heading: "Your account",
    body: "Keep your sign-in details private. Tell us at admin@ahavah.app if you suspect unauthorized access.",
  },
  {
    slug: "conduct",
    heading: "Acceptable conduct",
    body: "Be honest, respectful, and lawful. Harassment, impersonation, illegal content, and abuse of other members will get you removed.",
  },
  {
    slug: "content",
    heading: "Your content",
    body: "You keep ownership of what you post. By posting you grant us a worldwide non-exclusive license to host, display, and process your content so the service works.",
  },
  {
    slug: "termination",
    heading: "Termination",
    body: "You can delete your account at any time from Settings. We can suspend or delete accounts that violate these terms or applicable law.",
  },
  {
    slug: "liability",
    heading: "Liability",
    body: "Ahavah is provided as-is. To the maximum extent allowed by law we're not liable for indirect damages, lost profits, or third-party content.",
  },
  {
    slug: "changes",
    heading: "Changes to these terms",
    body: "We may update these terms; material changes will be announced in-app or by email. Continued use after a change means you accept the new terms.",
  },
  {
    slug: "contact",
    heading: "Contact",
    body: "Questions about these terms? Email admin@ahavah.app.",
  },
];

export default function TermsPage() {
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
            Terms of service<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">
            Plain-language rules for using Ahavah. Last updated 2026-05-19.
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
