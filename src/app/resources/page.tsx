// /resources: hub index. Guides grouped by cluster + latest updates row.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { ResourceHero, ArticleCard, ArticleList } from "@/components/app/resources/resource-sections";
import { buildCollectionGraph } from "@/components/app/resources/resources-jsonld";
import { getGuides, getUpdates, CLUSTER_META, type Cluster } from "@/lib/content";

const TITLE = "Resources";
const DESCRIPTION =
  "Guides on finding a Torah-observant spouse, biblical marriage, verification, and meeting across borders. From the team behind Ahavah.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/resources" },
  openGraph: { title: `${TITLE} · Ahavah`, description: DESCRIPTION, url: "https://ahavah.app/resources" },
};

const CLUSTER_ORDER: Cluster[] = ["messianic", "polygyny", "cross-border"];

export default function ResourcesPage() {
  const guides = getGuides();
  const updates = getUpdates();
  const graph = buildCollectionGraph({ url: "https://ahavah.app/resources", name: TITLE, description: DESCRIPTION });

  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-12">
        <ResourceHero
          eyebrow="Resources"
          title={<>Guides for the journey to marriage<span className="text-(--color-lime)">.</span></>}
          subhead="Practical, belief-aware guides on finding a spouse, verification and safety, and meeting someone across borders."
        />

        {CLUSTER_ORDER.map((cluster) => {
          const items = guides.filter((g) => g.cluster === cluster);
          if (items.length === 0) return null;
          return (
            <section key={cluster} className="flex flex-col gap-4">
              <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.12em] text-(--color-lavender)">
                {CLUSTER_META[cluster].label}
              </h2>
              <ArticleList>
                {items.map((g) => (
                  <ArticleCard
                    key={g.slug}
                    href={`/resources/${g.slug}`}
                    label={CLUSTER_META[g.cluster].label}
                    meta={`${g.readingMinutes} min read`}
                    title={g.title}
                    description={g.description}
                  />
                ))}
              </ArticleList>
            </section>
          );
        })}

        {updates.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.12em] text-(--color-lavender)">
              Latest updates
            </h2>
            <ArticleList>
              {updates.slice(0, 3).map((u) => (
                <ArticleCard
                  key={u.slug}
                  href={`/resources/updates/${u.slug}`}
                  label={new Date(u.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  meta={`${u.readingMinutes} min read`}
                  title={u.title}
                  description={u.description}
                />
              ))}
            </ArticleList>
          </section>
        ) : null}
      </main>
      <MarketingFooter />
    </div>
  );
}
