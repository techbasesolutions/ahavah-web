// /messianic-matchmaking — SEO landing page (niche identity cluster).
// Server component: exports metadata + emits WebPage/BreadcrumbList JSON-LD.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { LandingHero, FeatureGrid, LandingCta } from "@/components/app/landing/landing-sections";
import { LandingFaq } from "@/components/app/landing/landing-faq";
import { buildLandingGraph } from "@/components/app/landing/landing-jsonld";

const TITLE = "Messianic & Torah-observant matchmaking";
const DESCRIPTION =
  "Ahavah is matchmaking for Messianic, Hebrew Roots, and Torah-observant believers seeking a spouse. Verified profiles, shared-belief filters, members across the diaspora.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/messianic-matchmaking" },
  openGraph: { title: `${TITLE} · Ahavah`, description: DESCRIPTION, url: "https://ahavah.app/messianic-matchmaking" },
};

const FEATURES = [
  {
    title: "Built around shared belief",
    body: "Filter by observance, assembly, and the convictions that actually matter to a marriage. No swiping past people who could never share your Sabbath or your table.",
  },
  {
    title: "Verified, not anonymous",
    body: "Every member passes identity verification before matching. Three tiers of trust, so you know the person across the screen is real.",
  },
  {
    title: "Across borders, in your language",
    body: "Members span the diaspora and over 100 languages. Distance is not a dealbreaker when the goal is marriage.",
  },
];

const FAQS = [
  {
    q: "Who is Ahavah for?",
    a: "Messianic, Hebrew Roots, and Torah-observant believers seeking a spouse. Members across the diaspora meet with verified identity and shared-belief filters.",
  },
  {
    q: "How is this different from a mainstream app?",
    a: "Ahavah is built for marriage, not casual dating. Profiles are verified, belief filters come first, and the culture is courtship-minded rather than swipe-driven.",
  },
  {
    q: "Is it free to join?",
    a: "The waitlist is free. At launch the core experience is free, with optional Premium and per-action tokens.",
  },
  {
    q: "When does it launch?",
    a: "Founding members are invited in summer 2026. Join the waitlist for a one-tap sign-in link when invites open.",
  },
];

export default function MessianicMatchmakingPage() {
  const graph = buildLandingGraph({ slug: "messianic-matchmaking", name: TITLE, description: DESCRIPTION });
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-12">
        <LandingHero
          eyebrow="Messianic matchmaking"
          title={<>Matchmaking for Torah-observant believers<span className="text-(--color-lime)">.</span></>}
          subhead="Ahavah is where Messianic, Hebrew Roots, and Torah-observant believers meet a spouse who shares their walk. Verified profiles, shared-belief filters, and members across the diaspora."
        />
        <FeatureGrid features={FEATURES} />
        <LandingFaq heading="Common questions" faqs={FAQS} />
        <LandingCta
          heading="Find someone who shares your walk."
          body="The waitlist is free and takes a minute. Founding members are invited first."
          secondary={{ href: "/resources/how-to-find-a-torah-observant-spouse", label: "Read: How to find a Torah-observant spouse" }}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
