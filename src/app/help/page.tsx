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

import { BackButton } from "@/components/app/back-button";
import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { useRequireSession } from "@/lib/use-require-session";

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
    a: "Go to Profile, then Settings, then Account, then Delete account. Your profile goes invisible immediately. After a 7-day grace window the account is permanently deleted. To cancel within that window, email support@ahavah.app from your sign-in address.",
  },
  {
    q: "Is my data shared?",
    a: "Your profile data is only shared with other Ahavah members per your visibility settings. Private fields (email, phone, account history) are never visible to other users.",
  },
];

const TOC: ReadonlyArray<{
  label: string;
  Icon: typeof HelpCircle;
  slug: string;
  active?: boolean;
}> = [
  { label: "Frequently asked",    Icon: HelpCircle,        slug: "faq",           active: true },
  { label: "Verification",        Icon: Shield,            slug: "verification" },
  { label: "Filters & discovery", Icon: SlidersHorizontal, slug: "discovery" },
  { label: "Account & data",      Icon: Settings,          slug: "account" },
  { label: "Safety",              Icon: AlertTriangle,     slug: "safety" },
  { label: "Get in touch",        Icon: Mail,              slug: "contact" },
];

export default function HelpPage() {
  useRequireSession();
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
              description="support@ahavah.app"
              href="mailto:support@ahavah.app?subject=Ahavah%20support"
            />
            <ContactRow
              Icon={Bug}
              tone="muted"
              title="Report a bug"
              description="support@ahavah.app"
              href="mailto:support@ahavah.app?subject=Ahavah%20bug%20report"
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
            <TocRow key={t.label} icon={t.Icon} label={t.label} slug={t.slug} active={t.active} />
          ))}

          <Link href="/verify" prefetch={false} className="block mt-3.5 hover:opacity-90 transition-opacity">
            <Card tone="default">
              <CardContent className="flex flex-col gap-2.5 p-4">
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-xl bg-lime/20 text-lime"
                >
                  <BookOpen className="size-4" />
                </span>
                <p className="text-meta font-semibold text-(--ink) m-0 mt-1">
                  Verification tiers
                </p>
                <p className="text-caption leading-relaxed text-(--ink-2) m-0">
                  Bronze, Silver, Gold: what each unlocks and what&apos;s required.
                </p>
              </CardContent>
            </Card>
          </Link>
        </nav>

        {/* CENTER — Search + FAQ accordion */}
        <article
          aria-label="Help articles"
          className="flex flex-col gap-3.5 max-w-190 min-w-0"
        >
          <section id="faq" className="scroll-mt-20 flex flex-col gap-3.5">
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
          </section>

          <section id="verification" className="scroll-mt-20 flex flex-col gap-2 mt-4">
            <h2 className="text-h3 text-(--ink) m-0">Verification</h2>
            <p className="text-meta leading-relaxed text-(--ink-2) m-0">
              Three tiers (Bronze / Silver / Gold). Bronze selfie is required to start matching. Higher tiers add liveness and government-ID checks. Full details and how to start at <Link href="/verify" className="text-lavender hover:underline">/verify</Link>.
            </p>
          </section>

          <section id="discovery" className="scroll-mt-20 flex flex-col gap-2 mt-4">
            <h2 className="text-h3 text-(--ink) m-0">Filters &amp; discovery</h2>
            <p className="text-meta leading-relaxed text-(--ink-2) m-0">
              Adjust who you see and who sees you via the filter sheet on <Link href="/discover" className="text-lavender hover:underline">/discover</Link> and the privacy controls in <Link href="/settings/privacy" className="text-lavender hover:underline">Settings → Privacy</Link>.
            </p>
          </section>

          <section id="account" className="scroll-mt-20 flex flex-col gap-2 mt-4">
            <h2 className="text-h3 text-(--ink) m-0">Account &amp; data</h2>
            <p className="text-meta leading-relaxed text-(--ink-2) m-0">
              Email change, password, account deletion, and data export live in <Link href="/settings/account" className="text-lavender hover:underline">Settings → Account</Link>. Notification preferences in <Link href="/settings/notifications" className="text-lavender hover:underline">Settings → Notifications</Link>.
            </p>
          </section>

          <section id="safety" className="scroll-mt-20 flex flex-col gap-2 mt-4">
            <h2 className="text-h3 text-(--ink) m-0">Safety</h2>
            <p className="text-meta leading-relaxed text-(--ink-2) m-0">
              Block or report anyone in one tap from their profile. Manage blocked members in <Link href="/settings/blocked" className="text-lavender hover:underline">Settings → Blocked</Link>. Safety controls in <Link href="/settings/safety" className="text-lavender hover:underline">Settings → Safety</Link>.
            </p>
          </section>

          <section id="contact" className="scroll-mt-20 flex flex-col gap-2 mt-4">
            <h2 className="text-h3 text-(--ink) m-0">Get in touch</h2>
            <p className="text-meta leading-relaxed text-(--ink-2) m-0">
              For anything else, email <a href="mailto:support@ahavah.app" className="text-lavender hover:underline">support@ahavah.app</a>. We usually reply the same business day.
            </p>
          </section>
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
                description="support@ahavah.app"
                href="mailto:support@ahavah.app?subject=Ahavah%20support"
              />
              <ContactRow
                Icon={Bug}
                tone="muted"
                title="Report a bug"
                description="support@ahavah.app"
                href="mailto:support@ahavah.app?subject=Ahavah%20bug%20report"
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
  slug,
  active,
}: {
  icon: typeof HelpCircle;
  label: string;
  slug: string;
  active?: boolean;
}) {
  return (
    <Link
      href={`#${slug}`}
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
    </Link>
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
