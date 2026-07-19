"use client";

// /faq is a public marketing route. Pixel-precise marketing rhythm
// (clamp() font-sizes, max-w-[1200px], text-[clamp(...)] arbitrary
// values) is taken from the landing-page design system established
// in commit c0645b4. Same rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";
import { Mail } from "lucide-react";

import { safeJsonLd } from "@/lib/json-ld";

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

const FAQ_GROUPS: ReadonlyArray<{ theme: string; items: ReadonlyArray<{ q: string; a: string }> }> = [
  {
    theme: "General",
    items: [
      {
        q: "Who is Ahavah for?",
        a: "Messianic, Hebrew Roots, and Torah-observant believers seeking a spouse. Members across the diaspora can meet across borders with verified identity and shared-belief filters. Polygyny is a recognised path, so the platform is not for never-married singles only.",
      },
      {
        q: "Is Ahavah a dating app?",
        a: "Ahavah is matchmaking built for marriage, not casual dating. The culture is courtship-minded, and the tools are made to help you find a spouse.",
      },
      {
        q: "Is it free?",
        a: "Ahavah is free to join. The core experience is free; Premium and per-action tokens are optional.",
      },
      {
        q: "Will it work on my phone?",
        a: "Ahavah is a Progressive Web App. Add to Home Screen on iOS and Android. There is no separate app store binary at launch.",
      },
      {
        q: "Is Ahavah available now?",
        a: "Yes. Ahavah is live. Sign up and create your profile in minutes.",
      },
      {
        q: "What is the marriage checklist?",
        a: "A free, guided activity at ahavah.app/marriage-checklist. Work through the biblical obligations Scripture sets for a husband and a wife, rate what matters most to you, add your own nice-to-haves and challenges, and email a personal summary to you and your spouse. Answers are never stored.",
      },
    ],
  },
  {
    theme: "Beliefs and marriage",
    items: [
      {
        q: "What beliefs is Ahavah built around?",
        a: "Ahavah serves Messianic, Hebrew Roots, and Torah-observant believers. Shared-belief filters let you match on observance and conviction.",
      },
      {
        q: "Does Ahavah recognise plural marriage?",
        a: "Yes. Polygyny is a recognised path on the platform, so it is not for never-married singles only. Members can be open about what they are seeking.",
      },
      {
        q: "Is this for casual dating?",
        a: "No. Ahavah is for people seeking marriage. If you are looking for something casual, this is not the platform.",
      },
    ],
  },
  {
    theme: "Verification and safety",
    items: [
      {
        q: "What is verification?",
        a: "Three tiers (Bronze, Silver, Gold) of identity checks. Bronze is required to start matching. Higher tiers unlock more trust signals to other members.",
      },
      {
        q: "How is my data handled?",
        a: "Verification documents are processed by Stripe Identity; we only receive a verified or not-verified result. Profile data is used only to match you. See /privacy for the full policy.",
      },
      {
        q: "How do you keep the community safe?",
        a: "Identity verification, clear community guidelines, and built-in report and block tools. We act on every report.",
      },
      {
        q: "Can I report or block someone?",
        a: "Yes. Use the menu on any profile or chat to report or block, or email support@ahavah.app.",
      },
    ],
  },
  {
    theme: "Across borders",
    items: [
      {
        q: "Can I match with someone in another country?",
        a: "Yes. Ahavah is built for the diaspora, so cross-border matching is the norm.",
      },
      {
        q: "How many languages are supported?",
        a: "Over 100. Language differences should not block a connection.",
      },
      {
        q: "Do I have to relocate?",
        a: "That is between you and your match. Ahavah helps you meet; where you build a life is your decision.",
      },
      {
        q: "How do I contact a real person?",
        a: "Email support@ahavah.app. A human reads it.",
      },
    ],
  },
];

const ALL_FAQS = FAQ_GROUPS.flatMap((g) => g.items);

export default function FaqPage() {
  // FAQPage structured data (AEO): lets search + answer engines surface these
  // Q&As as rich results / People-Also-Ask. Built from the same FAQS array.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
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

        <div className="flex flex-col gap-10">
          {FAQ_GROUPS.map((group) => (
            <section key={group.theme} className="flex flex-col gap-4">
              <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.12em] text-(--color-lavender)">
                {group.theme}
              </h2>
              <Accordion className="flex flex-col gap-3">
                {group.items.map((faq, i) => (
                  <AccordionItem
                    key={`${group.theme}-${i}`}
                    value={`${group.theme}-${i}`}
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
            </section>
          ))}
        </div>

        <Card tone="default" className="border border-lavender/30 bg-lavender/10 p-6 max-w-[720px]">
          <CardContent className="flex items-center gap-4 p-0">
            <IconBadge tone="brand" size="xl" shape="square">
              <Mail className="size-5" />
            </IconBadge>
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-base font-bold text-(--ink) m-0">Need a real person?</p>
              <a
                href="mailto:support@ahavah.app"
                className="text-sm font-semibold text-lavender hover:underline"
              >
                support@ahavah.app
              </a>
            </div>
          </CardContent>
        </Card>
      </main>

      <MarketingFooter />
    </div>
  );
}
