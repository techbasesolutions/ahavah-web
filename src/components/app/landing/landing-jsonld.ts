// Builds WebPage + BreadcrumbList structured data for a landing page.
// FAQPage is emitted separately by LandingFaq. Kept tiny + pure so each
// server page can `JSON.stringify` the result into a single <script>.
const BASE = "https://ahavah.app";

export function buildLandingGraph(opts: {
  slug: string; // e.g. "messianic-matchmaking" (no leading slash)
  name: string; // page title text
  description: string;
}) {
  const url = `${BASE}/${opts.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: opts.name,
        description: opts.description,
        isPartOf: { "@id": `${BASE}/#website` },
        about: { "@id": `${BASE}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: opts.name, item: url },
        ],
      },
    ],
  };
}
