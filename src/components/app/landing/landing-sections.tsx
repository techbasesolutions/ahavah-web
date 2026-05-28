// Reusable marketing sections for the SEO landing pages. Server-compatible
// (no hooks). Reuses the landing design tokens + clamp() rhythm established
// in src/app/page.tsx / src/app/community/page.tsx.
/* eslint-disable no-restricted-syntax */

import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingHero({
  eyebrow,
  title,
  subhead,
}: {
  eyebrow: string;
  title: ReactNode; // allow a colored accent span
  subhead: string;
}) {
  return (
    <header className="flex flex-col gap-4 max-w-[760px]">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
        {eyebrow}
      </span>
      <h1
        className="m-0 text-(--ink) text-[clamp(36px,7vw,72px)]"
        style={{
          fontFamily: "var(--font-display)",
          lineHeight: 0.94,
          letterSpacing: "-0.025em",
          fontWeight: 400,
        }}
      >
        {title}
      </h1>
      <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">{subhead}</p>
      <div className="mt-2">
        <Button
          tone="elevated"
          size="tap"
          render={<Link href="/waitlist" prefetch={false} />}
          className="rounded-xl"
        >
          Join the waitlist
        </Button>
      </div>
    </header>
  );
}

export function FeatureGrid({
  features,
}: {
  features: ReadonlyArray<{ title: string; body: string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <div
          key={f.title}
          className="rounded-2xl border border-(--hairline) bg-(--card) p-6 flex flex-col gap-2"
        >
          <h2 className="m-0 text-lg font-bold text-(--ink) tracking-tight">{f.title}</h2>
          <p className="m-0 text-base leading-[1.65] text-(--ink-2)">{f.body}</p>
        </div>
      ))}
    </div>
  );
}

export function LandingCta({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="rounded-3xl border border-lavender/30 bg-lavender/10 p-8 lg:p-12 flex flex-col gap-4 items-start">
      <h2
        className="m-0 text-(--ink) text-[clamp(28px,4vw,44px)]"
        style={{ fontFamily: "var(--font-display)", lineHeight: 1.0, fontWeight: 400 }}
      >
        {heading}
      </h2>
      <p className="m-0 text-base lg:text-lg leading-[1.6] text-(--ink-2) max-w-[620px]">{body}</p>
      <Button
        tone="elevated"
        size="tap"
        render={<Link href="/waitlist" prefetch={false} />}
        className="rounded-xl"
      >
        Join the waitlist
      </Button>
    </section>
  );
}
