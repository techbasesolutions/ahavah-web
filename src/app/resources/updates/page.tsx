// /resources/updates — dated announcements index. Empty state until posts exist.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { ResourceHero, ArticleCard, ArticleList } from "@/components/app/resources/resource-sections";
import { buildCollectionGraph } from "@/components/app/resources/resources-jsonld";
import { getUpdates } from "@/lib/content";

const TITLE = "Updates";
const DESCRIPTION = "Announcements and product updates from the Ahavah team.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/resources/updates" },
};

export default function UpdatesPage() {
  const updates = getUpdates();
  const graph = buildCollectionGraph({ url: "https://ahavah.app/resources/updates", name: TITLE, description: DESCRIPTION });

  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-10">
        <ResourceHero
          eyebrow="Updates"
          title={<>Product updates<span className="text-(--color-lime)">.</span></>}
          subhead="Announcements and progress from the team building Ahavah."
        />
        {updates.length > 0 ? (
          <ArticleList>
            {updates.map((u) => (
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
        ) : (
          <div className="rounded-2xl border border-(--hairline) bg-(--card) p-8 text-(--ink-2)">
            No updates yet. Check back soon, or <a href="/waitlist" className="font-semibold text-(--color-lavender) hover:underline">join the waitlist</a> for news.
          </div>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}
