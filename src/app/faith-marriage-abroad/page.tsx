// /faith-marriage-abroad — SEO landing page (cross-border cluster).
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { LandingHero, FeatureGrid, LandingCta } from "@/components/app/landing/landing-sections";
import { LandingFaq } from "@/components/app/landing/landing-faq";
import { buildLandingGraph } from "@/components/app/landing/landing-jsonld";
import { safeJsonLd } from "@/lib/json-ld";

const TITLE = "International faith-based marriage";
const DESCRIPTION =
  "Ahavah connects Torah-observant believers across the diaspora. Verified profiles, over 100 languages, and tools built for meeting a spouse who lives in another country.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faith-marriage-abroad" },
  openGraph: { title: `${TITLE} · Ahavah`, description: DESCRIPTION, url: "https://ahavah.app/faith-marriage-abroad", images: ["/og.png"] },
};

const FEATURES = [
  {
    title: "A worldwide community",
    body: "Members are spread across continents. If the right person lives abroad, that should be the start of the story, not the end.",
  },
  {
    title: "Over 100 languages",
    body: "Language should not stand between two believers. Ahavah is built to bridge it.",
  },
  {
    title: "Verified before you meet",
    body: "International introductions carry more risk. Identity verification and three tiers of trust reduce it before you ever talk.",
  },
];

const FAQS = [
  {
    q: "Can I match with someone in another country?",
    a: "Yes. Ahavah is built for the diaspora, so cross-border matching is the norm, not the exception.",
  },
  {
    q: "How many languages are supported?",
    a: "Over 100. The platform is designed so language differences do not block a connection.",
  },
  {
    q: "How do you handle trust across borders?",
    a: "Every member passes identity verification, with three tiers of trust signals. You see how verified someone is before you engage.",
  },
  {
    q: "When does it launch?",
    a: "Founding members are invited in summer 2026. Join the waitlist for a one-tap sign-in link when invites open.",
  },
];

export default function FaithMarriageAbroadPage() {
  const graph = buildLandingGraph({ slug: "faith-marriage-abroad", name: TITLE, description: DESCRIPTION });
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-12">
        <LandingHero
          eyebrow="Across borders"
          title={<>Meet a spouse across borders<span className="text-(--color-lime)">.</span></>}
          subhead="Ahavah connects Torah-observant believers across the diaspora. Verified profiles, over 100 languages, and tools built for meeting someone who lives in another country."
        />
        <FeatureGrid features={FEATURES} />
        <LandingFaq heading="Common questions" faqs={FAQS} />
        <LandingCta
          heading="The right person might live abroad."
          body="The waitlist is free. Meet verified believers across the diaspora."
          secondary={{ href: "/resources/marrying-across-borders-safely", label: "Read: Marrying across borders safely" }}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
