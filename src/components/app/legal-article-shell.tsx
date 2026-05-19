"use client";

// Behind-auth legal shell. The session-aware brand-bar CTA reads
// getSessionToken() (localStorage-backed) after mount to swap between
// "Sign in" and "Back to app" — same post-mount setState pattern as
// /help, with the same lint rationale.
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  FileText,
  Heart,
  Lock,
  Mail,
  Phone,
  Shield,
  UserPen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/kibo-ui/pill";

import { BackButton } from "@/components/app/back-button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { getSessionToken } from "@/lib/api-client";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

/**
 * Icon map for the canonical TOC row. Names mirror desktop-extra.jsx
 * `i:"shield" | "heart" | "file" | "book" | "mail" | "userpen" | "lock" |
 *  "alert" | "phone"`. Map to lucide equivalents.
 */
const TOC_ICONS = {
  shield: Shield,
  heart: Heart,
  file: FileText,
  book: BookOpen,
  mail: Mail,
  userpen: UserPen,
  lock: Lock,
  alert: AlertTriangle,
  phone: Phone,
} as const;

export type TocItem = {
  label: string;
  icon: keyof typeof TOC_ICONS;
  /** Anchor slug for in-page scroll navigation. Must match a sibling
   *  BodySection.slug so clicking the TOC row scrolls to the section. */
  slug: string;
  active?: boolean;
};

export type BodySection = {
  heading: string;
  body: ReactNode;
  /** Anchor slug — `id` attribute on the rendered <section>. */
  slug: string;
};

export type LegalKind = "terms" | "privacy" | "community";

type Props = {
  /** Which doc is open — drives the active brand-bar tab pill. */
  kind: LegalKind;
  /** Doc title — also the eyebrow + page <h1>. */
  title: string;
  /** Opening paragraph below the title. */
  lead: ReactNode;
  /** Body sections rendered as h2 + paragraph blocks. */
  sections: ReadonlyArray<BodySection>;
  /** Table of contents items rendered in the right rail. */
  toc: ReadonlyArray<TocItem>;
  /** Last-updated date string for the left aside footer. */
  updated: string;
};

const BRAND_TABS: ReadonlyArray<{ label: string; kind: LegalKind; href: string }> = [
  { label: "Terms",     kind: "terms",     href: "/legal/terms" },
  { label: "Privacy",   kind: "privacy",   href: "/legal/privacy" },
  { label: "Community", kind: "community", href: "/legal/community-guidelines" },
];

/**
 * Canonical /legal/* shell — direct port of LegalShell in
 * `8-New-Desktops/new-desktop-export/desktop-extra.jsx`.
 *
 * Desktop (md+): slim brand-bar header (h-16, Logo + 3-tab pills + Sign in
 * CTA) over a 3-col grid: 1fr gradient context column · 760px article ·
 * 1fr TOC. No left sidebar — these pages are signed-out reachable and use
 * the brand bar instead.
 *
 * Mobile (<md): single-column with a regular PageHeader (BackButton +
 * title), then the article body inline. The 3-col aside chrome collapses.
 *
 * Theme-aware throughout (--app / --card / --ink* / --hairline /
 * --color-lavender / --color-lime).
 */
export function LegalArticleShell({
  kind,
  title,
  lead,
  sections,
  toc,
  updated,
}: Props) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setSignedIn(Boolean(getSessionToken()));
  }, []);

  return (
    <PageShell bottomPad="none" desktopShell="full-bleed">
      {/* ── Desktop brand bar ───────────────────────────────────────── */}
      <header className="hidden md:flex h-16 shrink-0 items-center justify-between px-8 border-b border-(--hairline) bg-(--app)">
        <Link href="/" aria-label="Ahavah home" className="leading-none">
          <Logo variant="horizontal" size="sm" priority />
        </Link>
        <nav aria-label="Legal" className="flex items-center gap-2.5">
          {BRAND_TABS.map((tab) =>
            tab.kind === kind ? (
              <Pill key={tab.kind} variant="lavender">
                {tab.label}
              </Pill>
            ) : (
              <Link
                key={tab.kind}
                href={tab.href}
                prefetch={false}
                className="px-3 py-1.5 text-sm font-medium text-(--ink-2) hover:text-(--ink) transition-colors"
              >
                {tab.label}
              </Link>
            ),
          )}
          <Button
            size="tap"
            tone={signedIn ? "elevated" : "cta"}
            className="ml-2"
            render={<Link href={signedIn ? "/discover" : "/auth/sign-in"} prefetch={false} />}
          >
            {signedIn ? "Back to app" : "Sign in"}
          </Button>
          <ThemeToggle variant="icon" />
        </nav>
      </header>

      {/* ── Mobile header ───────────────────────────────────────────── */}
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <BackButton fallback="/" label="Back" />
        <PageHeaderTitle>{title}</PageHeaderTitle>
      </PageHeader>

      {/* ── Mobile single-column body ───────────────────────────────── */}
      <article className="md:hidden flex flex-col gap-6 px-5 pt-4">
        <div>
          <p className="text-overline text-lavender m-0">{title}</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-(--ink) m-0">
            {title}
            <span className="text-lime">.</span>
          </h1>
          <p className="mt-4 text-body leading-relaxed text-(--ink-2)">{lead}</p>
        </div>
        {sections.map((s, i) => (
          <section key={i} id={s.slug} className="scroll-mt-20 flex flex-col gap-2">
            <h2 className="text-h3 text-(--ink) m-0">{s.heading}</h2>
            <p className="text-meta leading-relaxed text-(--ink-2) m-0">
              {s.body}
            </p>
          </section>
        ))}
        <Card
          id="contact"
          tone="default"
          className="scroll-mt-20 border border-lavender/30 bg-lavender/10 p-5"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lavender/20 text-lavender"
            >
              <Mail className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-meta font-bold text-(--ink) m-0">
                Questions or concerns?
              </p>
              <Link
                href="mailto:admin@ahavah.app"
                className="mt-0.5 block text-sm font-semibold text-lavender hover:underline"
              >
                admin@ahavah.app
              </Link>
            </div>
          </div>
        </Card>
        <p className="text-caption text-(--ink-3) pt-2 pb-4">
          Last updated · {updated}
        </p>
      </article>

      {/* ── Desktop 3-col body ─────────────────────────────────────── */}
      {/* grid-rows-[1fr] forces the single row to fill the flex-1 height
          of this grid, so the left gradient aside stretches to the full
          viewport height instead of sizing to its content. Without it,
          auto-rows shrinks the row to the tallest cell's intrinsic size. */}
      <div className="hidden md:grid flex-1 grid-cols-[1fr_760px_1fr] grid-rows-[1fr] overflow-hidden">
        {/* LEFT — gradient context column */}
        <aside
          className="px-10 py-12 flex flex-col justify-between"
          style={{
            background:
              "linear-gradient(180deg, var(--app), color-mix(in oklch, var(--color-lavender) 10%, var(--app)))",
          }}
        >
          <div>
            <span className="text-overline text-(--ink-2)">Legal</span>
            <h2 className="mt-2.5 mb-2 text-h3 text-(--ink) m-0">
              Plain-language policies.
            </h2>
            <p className="text-meta text-(--ink-2) leading-relaxed m-0">
              We try to write our legal pages the way we&apos;d want to read
              them. If anything is unclear, email us.
            </p>
          </div>
          <p className="text-caption text-(--ink-3) m-0">
            Last updated · {updated}
          </p>
        </aside>

        {/* CENTER — 760px article */}
        <article
          className="px-14 py-12 overflow-y-auto flex flex-col gap-6 border-l border-r border-(--hairline)"
        >
          <div>
            <p className="text-overline text-lavender m-0">
              {title}
            </p>
            <h1 className="mt-2 text-display-lg text-(--ink) leading-tight tracking-tight m-0">
              {title}
              <span className="text-lime">.</span>
            </h1>
            <p className="mt-4 text-body text-(--ink-2) leading-relaxed m-0">
              {lead}
            </p>
          </div>
          {sections.map((s, i) => (
            <section key={i} id={s.slug} className="scroll-mt-20">
              <h2 className="mt-2 mb-2.5 text-h3 text-(--ink) m-0">
                {s.heading}
              </h2>
              <p className="text-base leading-loose text-(--ink-2) m-0 text-pretty">
                {s.body}
              </p>
            </section>
          ))}
          <Card
            id="contact"
            tone="default"
            className="scroll-mt-20 border border-lavender/30 bg-lavender/10 p-5"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lavender/20 text-lavender"
              >
                <Mail className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-meta font-bold text-(--ink) m-0">
                  Questions or concerns?
                </p>
                <Link
                  href="mailto:admin@ahavah.app"
                  className="mt-0.5 block text-sm font-semibold text-lavender hover:underline"
                >
                  admin@ahavah.app
                </Link>
              </div>
            </div>
          </Card>
        </article>

        {/* RIGHT — TOC rail */}
        <aside className="px-10 py-12 flex flex-col gap-6">
          <div>
            <p className="text-overline text-(--ink-2) mb-3.5 m-0">Contents</p>
            <nav aria-label="Page contents" className="flex flex-col gap-1">
              {toc.map((item, i) => {
                const I = TOC_ICONS[item.icon];
                const active = !!item.active;
                return (
                  <Link
                    key={i}
                    href={`#${item.slug}`}
                    className={
                      active
                        ? "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-lavender/40 bg-lavender/12 hover:bg-lavender/20 transition-colors"
                        : "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-(--app)/60 transition-colors"
                    }
                  >
                    <span
                      aria-hidden
                      className={
                        active
                          ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-lavender/20 text-lavender"
                          : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-card border border-(--hairline) text-(--ink-2)"
                      }
                    >
                      <I className="size-3.5" />
                    </span>
                    <span
                      className={
                        active
                          ? "flex-1 text-meta font-bold text-(--ink) truncate"
                          : "flex-1 text-meta font-medium text-(--ink) truncate"
                      }
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

        </aside>
      </div>
    </PageShell>
  );
}
