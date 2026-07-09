import type { Metadata } from "next";

import { safeJsonLd } from "@/lib/json-ld";
import { ChecklistClient } from "@/components/app/marriage-checklist/checklist-client";
import { PASSAGES } from "@/app/marriage-checklist/content";

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

// Visible FAQ (below the activity) + FAQPage JSON-LD, for search engines and
// answer engines. The activity itself is a client stepper, so this section is
// the page's crawlable depth.
const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Is the marriage checklist free?",
    a: "Yes. The checklist is a free activity from Ahavah. You confirm your email with a one-time code to receive your summary, and no matchmaking profile is required.",
  },
  {
    q: "Do you store my answers?",
    a: "No. Your answers live only on the page while you complete it. When you send your summary, we compose the email and discard your responses. Nothing is saved to our servers.",
  },
  {
    q: "Which Bible passages are included?",
    a: "Section one covers Genesis 2:18-24, Exodus 21:10-11, Proverbs 5:15-19, 1 Corinthians 7:2-5, Ephesians 5:22-33, Colossians 3:18-19, 1 Peter 3:1-7, Malachi 2:14-16, and Hebrews 13:4, quoted verbatim from the KJV and linked to the full passage on YouVersion. We add no titles and no interpretation.",
  },
  {
    q: "Can I use it if I am single?",
    a: "Yes. Complete it for yourself to clarify your own non-negotiables, or send it to someone you are courting. It is a clear way to show you are intentional about marriage.",
  },
  {
    q: "How does my spouse get the results?",
    a: "After you finish, you add your spouse's email and the same summary is emailed to you both, so you can read it side by side and talk it through together.",
  },
  {
    q: "Who made the marriage checklist?",
    a: "Ahavah, the matchmaking platform for Messianic and Torah-observant believers seeking a spouse across borders.",
  },
];

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
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
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
        {/* Server-rendered crawlable depth: what is inside + FAQ. The
            activity is a client stepper, so search and answer engines read
            this section (mirrored in the FAQPage JSON-LD above). */}
        <section className="mc mc--seo" aria-label="About the marriage checklist">
          <div className="mc-col">
            <h2 className="mc-seo-h2">What is inside the checklist</h2>
            <p className="mc-seo-p">
              The Marriage Checklist is a free, guided activity for
              Torah-observant couples and singles preparing for marriage. It
              has three sections: the biblical obligations Scripture sets for
              a husband and a wife, your own nice-to-haves, and the challenges
              and obstacles you want to face honestly together. For every item
              you rate how much it matters to you, choose how often you would
              practice it, and record where you stand.
            </p>
            <p className="mc-seo-p">
              Section one quotes each passage verbatim from the KJV, with a
              link to the full text on YouVersion. We add no titles and no
              interpretation. The passages are:
            </p>
            <ul className="mc-seo-list">
              {PASSAGES.map((p) => (
                <li key={p.id}>
                  <a href={p.link} target="_blank" rel="noopener noreferrer">{p.ref}</a>
                  {p.roles.length === 1 ? " (husband only)" : ""}
                </li>
              ))}
            </ul>

            <h2 className="mc-seo-h2">Common questions</h2>
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <h3 className="mc-seo-q">{q}</h3>
                <p className="mc-seo-p">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
