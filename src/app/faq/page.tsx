"use client";

// /faq is a public marketing route. Pixel-precise marketing rhythm
// (clamp() font-sizes, max-w-[1200px], text-[clamp(...)] arbitrary
// values) is taken from the landing-page design system established
// in commit c0645b4. Same rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";
import { Mail } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Who is Ahavah for?",
    a: "Torah-observant singles seeking marriage. Members across the diaspora can match across borders with verified identity and faith-aware filters.",
  },
  {
    q: "Is it free?",
    a: "The waitlist is free. At launch, the core experience is free; Premium and per-action tokens are optional.",
  },
  {
    q: "What is verification?",
    a: "Three tiers (Bronze / Silver / Gold) of identity checks. Bronze is required to start matching. Higher tiers unlock more trust signals to other members.",
  },
  {
    q: "Will it work on my phone?",
    a: "Ahavah is a Progressive Web App — Add to Home Screen on iOS and Android. There is no separate app store binary at launch.",
  },
  {
    q: "How is my data handled?",
    a: "Verification documents are processed by Stripe Identity; we only receive a verified/not-verified result. Profile data is used only to match you. See /privacy for the full policy.",
  },
  {
    q: "When does it launch?",
    a: "Spring 2026 for founding members. The waitlist will receive an email with a one-tap sign-in link as soon as invites open.",
  },
];

export default function FaqPage() {
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

      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-10">
        <header className="flex flex-col gap-4 max-w-[720px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
            Help &amp; FAQ
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
            Questions, answered<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">
            What Ahavah is, how it works, and how to reach a real person on the team.
          </p>
        </header>

        <Accordion className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-2xl border border-(--hairline) bg-(--card) px-5"
            >
              <AccordionTrigger className="py-4 text-base font-semibold text-(--ink) hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-meta leading-relaxed text-(--ink-2)">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Card tone="default" className="border border-lavender/30 bg-lavender/10 p-6 max-w-[720px]">
          <CardContent className="flex items-center gap-4 p-0">
            <IconBadge tone="brand" size="xl" shape="square">
              <Mail className="size-5" />
            </IconBadge>
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-base font-bold text-(--ink) m-0">Need a real person?</p>
              <a
                href="mailto:admin@ahavah.app"
                className="text-sm font-semibold text-lavender hover:underline"
              >
                admin@ahavah.app
              </a>
            </div>
          </CardContent>
        </Card>
      </main>

      <MarketingFooter />
    </div>
  );
}
