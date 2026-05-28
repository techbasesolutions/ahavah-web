// /resources/[slug] — a guide article. Server component: dynamic-imports
// the MDX body, reads metadata from the content loader.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { buildArticleGraph } from "@/components/app/resources/resources-jsonld";
import { getGuide, getGuides, CLUSTER_META } from "@/lib/content";

export function generateStaticParams() {
  return getGuides().map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/resources/${guide.slug}` },
    openGraph: { title: `${guide.title} · Ahavah`, description: guide.description, url: `https://ahavah.app/resources/${guide.slug}` },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const { default: Body } = await import(`@/content/guides/${slug}.mdx`);
  const url = `https://ahavah.app/resources/${guide.slug}`;
  const cluster = CLUSTER_META[guide.cluster];
  const graph = buildArticleGraph({
    url,
    title: guide.title,
    description: guide.description,
    datePublished: guide.updated,
    crumbName: guide.title,
  });

  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[760px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-6">
        <nav className="text-sm text-(--ink-2)">
          <Link href="/resources" className="hover:text-(--color-lavender)">Resources</Link>
          <span className="px-2">/</span>
          <span>{cluster.label}</span>
        </nav>
        <header className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
            {cluster.label} · {guide.readingMinutes} min read
          </span>
          <h1
            className="m-0 text-(--ink) text-[clamp(30px,5.5vw,52px)]"
            style={{ fontFamily: "var(--font-display)", lineHeight: 0.98, letterSpacing: "-0.02em", fontWeight: 400 }}
          >
            {guide.title}
          </h1>
          <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">{guide.description}</p>
        </header>

        <article className="flex flex-col">
          <Body />
        </article>

        <aside className="mt-6 rounded-3xl border border-lavender/30 bg-lavender/10 p-6 flex flex-col gap-3 items-start">
          <p className="m-0 text-base font-bold text-(--ink)">Ready to start?</p>
          <p className="m-0 text-sm leading-[1.6] text-(--ink-2)">
            Read more about <Link href={cluster.landing} className="font-semibold text-(--color-lavender) hover:underline">{cluster.label.toLowerCase()}</Link>, or join the waitlist.
          </p>
          <Link
            href="/waitlist"
            className="rounded-xl bg-(--color-lime) px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity"
          >
            Join the waitlist
          </Link>
        </aside>
      </main>
      <MarketingFooter />
    </div>
  );
}
