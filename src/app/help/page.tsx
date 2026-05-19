"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BookOpen,
  Bug,
  ChevronRight,
  HelpCircle,
  Mail,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/kibo-ui/pill";

import { BackButton } from "@/components/app/back-button";
import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "How does verification work?",
    a: "We use a three-tier system. Bronze confirms a real person via selfie + photo cross-check. Silver adds a liveness check to distinguish you from a video. Gold matches a government ID to your face for the highest trust signal.",
  },
  {
    q: "How do filters work?",
    a: "Tap the sliders icon on Discover or Map to set country, language, age range, faith, and intent filters. Filters are shared across both surfaces, so narrowing on Map narrows your swipe deck too.",
  },
  {
    q: "Why don't I see anyone?",
    a: "Your filters might be too narrow. Open the filter sheet and clear or widen your selections. You can also tap 'Reset all decisions' on the empty deck to revisit candidates you've already passed.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Profile, then Settings, then Account, then Delete account. Your profile goes invisible immediately. After a 7-day grace window the account is permanently deleted. To cancel within that window, email admin@ahavah.app from your sign-in address.",
  },
  {
    q: "Is my data shared?",
    a: "Your profile data is only shared with other Ahavah members per your visibility settings. Private fields (email, phone, account history) are never visible to other users.",
  },
];

const TOC: ReadonlyArray<{
  label: string;
  Icon: typeof HelpCircle;
  active?: boolean;
}> = [
  { label: "Frequently asked",    Icon: HelpCircle,        active: true },
  { label: "Verification",        Icon: Shield },
  { label: "Filters & discovery", Icon: SlidersHorizontal },
  { label: "Account & data",      Icon: Settings },
  { label: "Safety",              Icon: AlertTriangle },
  { label: "Get in touch",        Icon: Mail },
];

export default function HelpPage() {
  return (
    <PageShell
      bottomPad="nav"
      desktopShell="sidebar"
      topBarTitle="Help center"
    >
      {/* ── Mobile header ───────────────────────────────────────────── */}
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <BackButton fallback="/settings" label="Back to settings" />
        <PageHeaderTitle>Help</PageHeaderTitle>
      </PageHeader>

      {/* ── Mobile copy intro ───────────────────────────────────────── */}
      <motion.p
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="md:hidden px-5 pt-2 pb-4 text-meta text-(--ink-2)"
      >
        Need help? Pick a topic below or reach out directly.
      </motion.p>

      {/* ── Mobile FAQ + contacts (single column) ───────────────────── */}
      <motion.section
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="md:hidden flex flex-col gap-2 px-5"
        aria-label="Frequently asked questions"
      >
        <h2 className="text-overline text-(--ink-3)">FAQ</h2>
        <Accordion className="flex flex-col gap-2">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-2xl border border-(--hairline) bg-card px-4 not-last:border-b"
            >
              <AccordionTrigger className="text-meta font-semibold text-(--ink)">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pb-3 text-caption leading-relaxed text-(--ink-2)">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.section>

      <motion.section
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.13 }}
        className="md:hidden mt-6 flex flex-col gap-3 px-5"
        aria-label="Get in touch"
      >
        <h2 className="text-overline text-(--ink-3)">Get in touch</h2>
        <Card tone="default">
          <CardContent className="flex flex-col gap-3 p-4">
            <ContactRow
              Icon={Mail}
              tone="brand"
              title="Email support"
              description="admin@ahavah.app"
              href="mailto:admin@ahavah.app?subject=Ahavah%20support"
            />
            <ContactRow
              Icon={Bug}
              tone="muted"
              title="Report a bug"
              description="admin@ahavah.app"
              href="mailto:admin@ahavah.app?subject=Ahavah%20bug%20report"
            />
          </CardContent>
        </Card>
      </motion.section>

      {/* ── Desktop 3-col body ─────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[260px_1fr_320px] gap-8 px-12 py-8 flex-1 min-h-0">
        {/* LEFT — TOC nav + "Read the guides" promo */}
        <nav
          aria-label="On this page"
          className="flex flex-col gap-1 self-start"
        >
          <p className="px-3 pb-2 text-overline text-(--ink-2)">On this page</p>
          {TOC.map((t) => (
            <TocRow key={t.label} icon={t.Icon} label={t.label} active={t.active} />
          ))}

          <Card tone="default" className="mt-3.5">
            <CardContent className="flex flex-col gap-2.5 p-4">
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-xl bg-lime/20 text-lime"
              >
                <BookOpen className="size-4" />
              </span>
              <p className="text-meta font-semibold text-(--ink) m-0 mt-1">
                Read the guides
              </p>
              <p className="text-caption leading-relaxed text-(--ink-2) m-0">
                Long-form articles on safety, dating, and the verification
                ladder.
              </p>
            </CardContent>
          </Card>
        </nav>

        {/* CENTER — Search + FAQ accordion */}
        <article
          aria-label="Help articles"
          className="flex flex-col gap-3.5 max-w-190 min-w-0"
        >
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-(--hairline) bg-card px-5">
            <Search className="size-4.5 shrink-0 text-(--ink-3)" />
            <span className="flex-1 text-base text-(--ink-3)">
              Search articles…
            </span>
            <Pill
              size="sm"
              variant="outline"
              className="border-lavender/40 text-lavender bg-transparent"
            >
              ⌘ K
            </Pill>
          </div>

          <h2 className="mt-3.5 text-overline text-(--ink-2)">
            Frequently asked
          </h2>
          <Accordion
            defaultValue={["faq-0"]}
            className="flex flex-col gap-3"
          >
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="not-last:border-b-0 rounded-2xl border border-(--hairline) bg-card px-5.5 data-[panel-open]:border-lavender/40"
              >
                <AccordionTrigger className="py-4.5 text-base font-semibold text-(--ink) hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4.5 pt-1 text-meta leading-relaxed text-(--ink-2)">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </article>

        {/* RIGHT — Get in touch + Emergency */}
        <aside className="flex flex-col gap-3.5 self-start">
          <Card tone="default">
            <CardContent className="flex flex-col gap-2.5 p-5.5">
              <p className="text-overline text-(--ink-2) m-0">Get in touch</p>
              <p className="text-meta leading-relaxed text-(--ink-2) m-0 mb-2">
                Reach a real person at our small support inbox. Usual
                response: same business day.
              </p>
              <ContactRow
                Icon={Mail}
                tone="brand"
                title="Email support"
                description="admin@ahavah.app"
                href="mailto:admin@ahavah.app?subject=Ahavah%20support"
              />
              <ContactRow
                Icon={Bug}
                tone="muted"
                title="Report a bug"
                description="admin@ahavah.app"
                href="mailto:admin@ahavah.app?subject=Ahavah%20bug%20report"
              />
            </CardContent>
          </Card>

          <Card tone="default">
            <CardContent className="flex flex-col gap-2.5 p-5.5">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-lg bg-lime/15 text-lime"
                >
                  <Shield className="size-3.5" />
                </span>
                <span className="text-meta font-semibold text-(--ink)">
                  Emergency?
                </span>
              </div>
              <p className="text-caption leading-relaxed text-(--ink-2) m-0">
                For immediate safety concerns contact local emergency
                services first, then email us so we can act on the account.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <BottomNav />
    </PageShell>
  );
}

/** Inline row used in the desktop TOC nav (NavRow canonical). */
function TocRow({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof HelpCircle;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-lavender/40 bg-lavender/12"
          : "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent"
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
        <Icon className="size-3.5" />
      </span>
      <span
        className={
          active
            ? "flex-1 text-meta font-bold text-(--ink) truncate"
            : "flex-1 text-meta font-medium text-(--ink) truncate"
        }
      >
        {label}
      </span>
    </div>
  );
}

/** Contact row used in both desktop + mobile "Get in touch" cards. */
function ContactRow({
  Icon,
  tone,
  title,
  description,
  href,
}: {
  Icon: typeof Mail;
  tone: "brand" | "muted";
  title: string;
  description: string;
  href: string;
}) {
  const tile =
    tone === "brand"
      ? "bg-lavender/20 text-lavender"
      : "bg-card border border-(--hairline) text-(--ink-2)";
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-(--app)/60 transition-colors"
    >
      <span
        aria-hidden
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tile}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-meta font-semibold text-(--ink) m-0 truncate">
          {title}
        </p>
        <p className="text-caption text-(--ink-3) m-0 truncate">
          {description}
        </p>
      </div>
      <ChevronRight
        aria-hidden
        className="size-3.5 text-(--ink-3) shrink-0"
      />
    </Link>
  );
}
