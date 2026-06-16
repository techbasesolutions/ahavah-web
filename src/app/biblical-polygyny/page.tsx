// /biblical-polygyny — SEO landing page (plural-marriage cluster).
// Doctrinally sensitive: claims stay grounded in existing site positioning.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { LandingHero, FeatureGrid, LandingCta } from "@/components/app/landing/landing-sections";
import { LandingFaq } from "@/components/app/landing/landing-faq";
import { safeJsonLd } from "@/lib/json-ld";
import { buildLandingGraph } from "@/components/app/landing/landing-jsonld";

const TITLE = "Biblical plural marriage matchmaking";
const DESCRIPTION =
  "Ahavah recognises biblical plural marriage as a path. Verified members, shared-belief filters, and a platform with a place for it instead of forcing the conversation off-app.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/biblical-polygyny" },
  openGraph: { title: `${TITLE} · Ahavah`, description: DESCRIPTION, url: "https://ahavah.app/biblical-polygyny", images: ["/og.png"] },
};

const FEATURES = [
  {
    title: "Recognised, not hidden",
    body: "Members can be open about seeking or living plural marriage. The platform has a place for it instead of forcing the conversation off-app.",
  },
  {
    title: "Verified members",
    body: "Identity verification applies to everyone. Trust signals matter even more when families are involved.",
  },
  {
    title: "Filter by conviction",
    body: "Match on observance and belief, including views on marriage, so first conversations start from common ground.",
  },
];

const FAQS = [
  {
    q: "Does Ahavah support plural marriage?",
    a: "Yes. Polygyny is a recognised path on the platform, so it is not for never-married singles only. Members can be open about what they are seeking.",
  },
  {
    q: "Is this only for men seeking additional wives?",
    a: "No. The platform serves anyone whose convictions include plural marriage, alongside the same verification and belief filters everyone uses.",
  },
  {
    q: "How do you keep it safe?",
    a: "All members pass identity verification, and the community guidelines apply equally. Report and block tools are built in.",
  },
  {
    q: "When can I join?",
    a: "Ahavah is live. Create your profile and start meeting verified believers today.",
  },
];

export default function BiblicalPolygynyPage() {
  const graph = buildLandingGraph({ slug: "biblical-polygyny", name: TITLE, description: DESCRIPTION });
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-12">
        <LandingHero
          eyebrow="Biblical marriage"
          title={<>A platform that recognises plural marriage<span className="text-(--color-lime)">.</span></>}
          subhead="Most matchmaking platforms have no category for it. Ahavah treats biblical plural marriage as a recognised path, with verified members and shared-belief filters."
        />
        <FeatureGrid features={FEATURES} />
        <LandingFaq heading="Common questions" faqs={FAQS} />
        <LandingCta
          heading="A place for what you believe."
          body="Ahavah is free to join. Be open about what you are seeking from the start."
          secondary={{ href: "/resources/biblical-plural-marriage-online", label: "Read: What a platform should get right" }}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
