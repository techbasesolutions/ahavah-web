// Resources hub UI sections. Server-compatible (no hooks). Reuses the
// marketing design tokens + clamp() rhythm.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";

export function ResourceHero({
  eyebrow,
  title,
  subhead,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subhead: string;
}) {
  return (
    <header className="flex flex-col gap-4 max-w-[760px]">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
        {eyebrow}
      </span>
      <h1
        className="m-0 text-(--ink) text-[clamp(36px,7vw,72px)]"
        style={{ fontFamily: "var(--font-display)", lineHeight: 0.94, letterSpacing: "-0.025em", fontWeight: 400 }}
      >
        {title}
      </h1>
      <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">{subhead}</p>
    </header>
  );
}

export function ArticleCard({
  href,
  label,
  meta,
  title,
  description,
}: {
  href: string;
  label: string; // cluster label or date
  meta: string; // e.g. "4 min read"
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-(--hairline) bg-(--card) p-6 flex flex-col gap-3 transition-colors hover:border-(--color-lavender)"
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-(--color-lavender)">
        <span>{label}</span>
        <span className="text-(--ink-2) font-medium normal-case tracking-normal">{meta}</span>
      </div>
      <h3 className="m-0 text-lg font-bold text-(--ink) tracking-tight group-hover:text-(--color-lavender) transition-colors">
        {title}
      </h3>
      <p className="m-0 text-sm leading-[1.6] text-(--ink-2)">{description}</p>
    </Link>
  );
}

export function ArticleList({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
