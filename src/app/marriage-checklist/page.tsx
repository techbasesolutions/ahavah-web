import type { Metadata } from "next";

import { safeJsonLd } from "@/lib/json-ld";
import { ChecklistClient } from "@/components/app/marriage-checklist/checklist-client";

import "./marriage-checklist.css";

/**
 * /marriage-checklist — public, SEO-oriented guided activity for couples.
 * Server component: exports metadata + emits JSON-LD, then renders the
 * client stepper. Design SOT: the Claude Design export
 * "Ahavah Marriage Checklist" (light mode, warm-paper canvas).
 */

export const metadata: Metadata = {
  title: "Marriage Checklist for Torah-Observant Couples",
  description:
    "A free, guided marriage checklist for Torah-observant couples. Work through biblical obligations together, rate what matters most to you, and send a personal summary to you and your spouse. Your answers are never stored.",
  alternates: { canonical: "/marriage-checklist" },
  openGraph: {
    title: "Marriage Checklist for Torah-Observant Couples",
    description:
      "Work through biblical marriage obligations together. Rate what matters most, and share a personal summary with your spouse.",
    url: "https://ahavah.app/marriage-checklist",
    type: "website",
    images: [
      {
        url: "/assets/og-marriage-checklist.png",
        width: 1200,
        height: 630,
        alt: "The Ahavah marriage checklist for Torah-observant couples",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Marriage Checklist for Torah-Observant Couples",
    description:
      "Work through Scripture together, decide what matters to you, and share it with your spouse.",
    images: ["/assets/og-marriage-checklist.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://ahavah.app/marriage-checklist",
      url: "https://ahavah.app/marriage-checklist",
      name: "Marriage Checklist for Torah-Observant Couples",
      description:
        "A free, guided marriage checklist for Torah-observant couples. Work through biblical obligations together and share a personal summary.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://ahavah.app/" },
        { "@type": "ListItem", position: 2, name: "Resources", item: "https://ahavah.app/resources" },
        { "@type": "ListItem", position: 3, name: "Marriage Checklist", item: "https://ahavah.app/marriage-checklist" },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to complete the Ahavah marriage checklist",
      description:
        "Work through curated marriage obligations with your spouse, rate what matters most, and send a personal summary to you both.",
      step: [
        { "@type": "HowToStep", position: 1, name: "Read each obligation", text: "Read the passage itself, quoted in full, with a link to the full text." },
        { "@type": "HowToStep", position: 2, name: "Rate what matters", text: "Set how important each obligation is to you, from one to five." },
        { "@type": "HowToStep", position: 3, name: "Record your stance", text: "Note whether you agree, disagree, or want to add a comment." },
        { "@type": "HowToStep", position: 4, name: "Share your summary", text: "Sign in and send a clean summary to you and your spouse." },
      ],
    },
  ],
};

export default function MarriageChecklistPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      {/* data-landing releases the .ahavah-app 414px mobile clamp for this
          full-bleed marketing surface (same escape as the landing page). */}
      <div data-landing>
        <ChecklistClient />
      </div>
    </>
  );
}
