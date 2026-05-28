// Structured data for the resources hub. Reuses the site Organization @id.
const BASE = "https://ahavah.app";

export function buildArticleGraph(opts: {
  url: string; // absolute
  title: string;
  description: string;
  datePublished: string;
  crumbName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${opts.url}#article`,
        headline: opts.title,
        description: opts.description,
        datePublished: opts.datePublished,
        dateModified: opts.datePublished,
        author: { "@id": `${BASE}/#organization` },
        publisher: { "@id": `${BASE}/#organization` },
        mainEntityOfPage: opts.url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Resources", item: `${BASE}/resources` },
          { "@type": "ListItem", position: 3, name: opts.crumbName, item: opts.url },
        ],
      },
    ],
  };
}

export function buildCollectionGraph(opts: { url: string; name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${opts.url}#collection`,
        url: opts.url,
        name: opts.name,
        description: opts.description,
        isPartOf: { "@id": `${BASE}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: opts.name, item: opts.url },
        ],
      },
    ],
  };
}
