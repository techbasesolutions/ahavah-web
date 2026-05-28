// /resources/updates/[slug] — a dated update article.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { buildArticleGraph } from "@/components/app/resources/resources-jsonld";
import { getUpdate, getUpdates } from "@/lib/content";

export function generateStaticParams() {
  return getUpdates().map((u) => ({ slug: u.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const update = getUpdate(slug);
  if (!update) return {};
  return {
    title: update.title,
    description: update.description,
    alternates: { canonical: `/resources/updates/${update.slug}` },
  };
}

export default async function UpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const update = getUpdate(slug);
  if (!update) notFound();

  const { default: Body } = await import(`@/content/updates/${slug}.mdx`);
  const url = `https://ahavah.app/resources/updates/${update.slug}`;
  const graph = buildArticleGraph({
    url,
    title: update.title,
    description: update.description,
    datePublished: update.date,
    crumbName: update.title,
  });

  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[760px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-6">
        <nav className="text-sm text-(--ink-2)">
          <Link href="/resources/updates" className="hover:text-(--color-lavender)">Updates</Link>
        </nav>
        <header className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
            {new Date(update.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
          </span>
          <h1
            className="m-0 text-(--ink) text-[clamp(30px,5.5vw,52px)]"
            style={{ fontFamily: "var(--font-display)", lineHeight: 0.98, letterSpacing: "-0.02em", fontWeight: 400 }}
          >
            {update.title}
          </h1>
        </header>
        <article className="flex flex-col">
          <Body />
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
