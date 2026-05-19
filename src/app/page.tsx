"use client";

// Landing rebuild — translates the design handoff at
// `Landing Page/Ahavah-handoff/ahavah/project/Ahavah Landing.html` (desktop)
// + `Ahavah Landing Mobile.html` (mobile) to kit primitives. Plan doc:
// docs/landing-rebuild-plan.md. Layout from the design HTMLs; colors from
// the project's semantic tokens in globals.css so light/dark both work.
//
// Marketing landing uses raw <img> for Unsplash-hosted photos — next/image
// requires width/height + remote-pattern config for decorative imagery.
/* eslint-disable @next/next/no-img-element */
// Inline style is required for: CSS-variable backgrounds, color-mix()/oklch()
// gradients, clamp() font sizes. Same trade-off as auth-illustration.tsx.
/* eslint-disable no-restricted-syntax */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Heart,
  IdCard,
  MapPin,
  PlayIcon,
  Scan,
  ShieldCheck,
  Sliders,
  Sparkles as SparklesIcon,
  X as XIcon,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LogoMark } from "@/components/brand/logo-mark";
import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { LandingStickyCta } from "@/components/app/landing-sticky-cta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { Pill } from "@/components/kibo-ui/pill";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";

const WAITLIST_STORAGE_KEY = "ahavah.waitlist.email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Brand canvas — 4 radial color-mix gradients over var(--app). Matches the
// design's `.brand-canvas` rule. Theme-adaptive: --app + brand colors flip
// for light/dark via globals.css.
const BRAND_CANVAS = `
  radial-gradient(ellipse 70% 30% at 10% 8%,  color-mix(in oklch, var(--color-lavender) 32%, transparent), transparent 70%),
  radial-gradient(ellipse 60% 30% at 90% 95%, color-mix(in oklch, var(--color-lime)     38%, transparent), transparent 70%),
  radial-gradient(ellipse 70% 30% at 85% 35%, color-mix(in oklch, var(--color-pink)     22%, transparent), transparent 70%),
  radial-gradient(ellipse 60% 30% at 15% 70%, color-mix(in oklch, var(--color-lavender) 22%, transparent), transparent 70%),
  var(--app)
`.trim();

// CTA-band gradient — indigo → mid → lavender. Design uses #5524F5 → #9F76EA
// → #BC96FF; --color-indigo + --color-lavender map to those endpoints, mid
// stop interpolated via color-mix.
const CTA_GRADIENT = `linear-gradient(
  135deg,
  var(--color-indigo) 0%,
  color-mix(in oklch, var(--color-indigo) 40%, var(--color-lavender)) 60%,
  var(--color-lavender) 100%
)`;

export default function LandingPage() {
  const { checking } = useRedirectIfSignedIn();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const formInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const prior = localStorage.getItem(WAITLIST_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (prior) setEmail(prior);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setMsg({ kind: "error", text: "Please enter a valid email so we can reach you." });
      formInputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 400));
    try {
      localStorage.setItem(WAITLIST_STORAGE_KEY, trimmed);
      sessionStorage.setItem(PENDING_EMAIL_KEY, trimmed);
    } catch {
      /* storage unavailable */
    }
    setMsg({
      kind: "success",
      text: `You're on the list. We'll email ${trimmed} when invites open.`,
    });
    setSubmitting(false);
  };

  const scrollToForm = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => formInputRef.current?.focus(), 400);
  };

  void checking;

  return (
    <div data-landing className="min-h-dvh font-sans text-(--ink)">
      {/* ════════════════════════════════ NAV ═════════════════════════════════ */}
      <MarketingHeader
        primaryNav={
          <>
            <a href="#how"      className="hover:text-(--ink) transition-colors">How it works</a>
            <a href="#features" className="hover:text-(--ink) transition-colors">Features</a>
            <a href="#verified" className="hover:text-(--ink) transition-colors">Verified</a>
            <Link href="/faq"   className="hover:text-(--ink) transition-colors">FAQ</Link>
          </>
        }
        cta={
          <Button tone="elevated" size="tap" onClick={scrollToForm} className="rounded-xl">
            Join waitlist
          </Button>
        }
      />

      {/* ═════════════ Brand-canvas wrapper: hero → CTA band ═════════════ */}
      <div style={{ background: BRAND_CANVAS }}>
        {/* ════════════════════════════ HERO ══════════════════════════════ */}
        <section
          id="waitlist"
          className="px-4 sm:px-6 md:px-8 pt-10 pb-14 lg:pt-24 lg:pb-30"
        >
          <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
              {/* Left — copy + form + stats */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <Pill variant="lavender">Pre-launch</Pill>
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--ink-2)">
                    Spring 2026 · Invite only
                  </span>
                </div>

                <h1
                  className="m-0 text-(--ink) text-[clamp(36px,9.8vw,92px)]"
                  style={{
                    fontFamily: "var(--font-display)",
                    lineHeight: 0.94,
                    letterSpacing: "-0.025em",
                    fontWeight: 400,
                  }}
                >
                  Find love
                  <br />
                  across{" "}
                  <span className="whitespace-nowrap">
                    borders<span className="inline-block text-(--color-lime) translate-y-[0.04em]">.</span>
                  </span>
                </h1>

                <p className="mt-6 lg:mt-7 max-w-[540px] text-[17px] lg:text-[21px] leading-[1.55] text-(--ink-2)">
                  Verified profiles, 100+ languages, real connections. The dating
                  app built for Torah-observant singles who don&apos;t fit anywhere else.
                </p>

                {/* ── Waitlist form ────────────────────────────────────────── */}
                <form onSubmit={handleSubmit} noValidate className="mt-9 max-w-[520px]">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <label htmlFor="waitlist-email" className="sr-only">
                      Email address
                    </label>
                    <Input
                      ref={formInputRef}
                      id="waitlist-email"
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (msg?.kind === "error") setMsg(null);
                      }}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      inputMode="email"
                      aria-describedby="waitlist-helper waitlist-msg"
                      error={msg?.kind === "error"}
                      size="lg"
                      className="flex-1 h-14 rounded-2xl"
                    />
                    <Button
                      type="submit"
                      tone="cta"
                      size="cta"
                      disabled={submitting}
                      {...(submitting ? { "aria-busy": "true" as const } : {})}
                      className="shrink-0 sm:w-auto sm:px-6 h-14"
                    >
                      {submitting ? "Saving…" : "Get early access"}
                      {!submitting && <ArrowRight size={18} strokeWidth={2.4} />}
                    </Button>
                  </div>

                  <p
                    id="waitlist-helper"
                    className="flex items-center gap-1.5 mt-3 text-[13px] text-(--ink-3)"
                  >
                    <ShieldCheck size={14} />
                    No spam. We email when launch is close. Unsubscribe anytime.
                  </p>

                  {msg && (
                    <div
                      id="waitlist-msg"
                      role="status"
                      aria-live="polite"
                      className={`mt-3 px-4 py-3 rounded-xl border text-sm text-(--ink) ${
                        msg.kind === "error"
                          ? "bg-pink/10 border-pink/30"
                          : "bg-lime/10 border-lime/30"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                </form>

                {/* ── Stats ────────────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-6 mt-14 max-w-[520px]" aria-label="Pre-launch interest">
                  {[
                    { num: "12,400", suffix: "+", lbl: "on the waitlist" },
                    { num: "63",     suffix: "",  lbl: "countries"       },
                    { num: "100",    suffix: "+", lbl: "languages"       },
                  ].map(({ num, suffix, lbl }) => (
                    <div key={lbl} className="min-w-0 text-center">
                      <div
                        className="text-(--ink) tabular-nums"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(28px, 2.6vw, 40px)",
                          fontWeight: 400,
                          letterSpacing: "-0.015em",
                          lineHeight: 1,
                        }}
                      >
                        {num}
                        <span className="text-(--color-lime)">{suffix}</span>
                      </div>
                      <div className="mt-2 text-[12px] lg:text-[13px] tracking-[0.02em] text-(--ink-2)">
                        {lbl}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — desktop phone (lg:+) / mobile card-stack (<lg:) */}
              <div className="flex justify-center items-center" aria-hidden="true">
                <CardStack className="lg:hidden" />
                <PhoneMockup className="hidden lg:block" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ FEATURES ═══════════════════════════ */}
        <section id="features" className="px-4 sm:px-6 md:px-8 py-20 lg:py-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">
            <SectionHead
              overline="What's different"
              title="A dating app that respects who you are."
              body="Built around real-world commitments — Shabbat, kashrut, calendar, family. So your first message isn't a 20-question screener."
            />

            {/* Mobile (<sm): single col / sm: 2 col / lg: 3 col. Mobile feature
                rows are inline (icon + body side-by-side); desktop tiles are
                stacked (icon top, body below). The Card primitive handles
                both via the layout utilities below. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 lg:gap-6">
              <FeatureCard tone="lavender"      Icon={ShieldCheck}    title="Verified profiles">
                Every member completes selfie verification before they can match.
                Optional silver + gold tiers add liveness + government-ID checks.
              </FeatureCard>
              <FeatureCard tone="lime"          Icon={Globe}          title="100+ languages">
                Match across borders. Live translation in chat for the languages
                our community speaks — from Hebrew to Yoruba to Tagalog.
              </FeatureCard>
              <FeatureCard tone="pink"          Icon={Heart}          title="Faith-aware filters">
                Calendar (lunar/solar), assembly, Torah level, polygyny stance —
                all first-class filters. Find someone whose practice fits yours.
              </FeatureCard>
              <FeatureCard tone="success"       Icon={SparklesIcon}  title="Real compatibility">
                9-axis compatibility scoring — observance, language, family,
                relocation, lifestyle. Surface people you actually align with.
              </FeatureCard>
              <FeatureCard tone="indigo"        Icon={MapPin}         title="Diaspora map">
                See your community geographically. Pan to a region, find people
                there — useful for traveling, relocating, or finding home.
              </FeatureCard>
              <FeatureCard tone="gold"          Icon={IdCard}         title="Privacy by design">
                Hide from map. Require verified matches. Block + report in one
                tap. We never share your government ID with other users.
              </FeatureCard>
            </div>
          </div>
        </section>

        {/* ═════════════════════════ HOW IT WORKS ═════════════════════════ */}
        <section id="how" className="px-4 sm:px-6 md:px-8 py-20 lg:py-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">
            <SectionHead
              overline="How it works"
              title="Three steps to your first conversation."
              body="Designed to get you talking with real people fast — without the endless onboarding spiral most apps make you suffer through."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  n: 1,
                  title: "Build your profile",
                  img: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800&q=80&auto=format&fit=crop",
                  alt: "Person on a phone, smiling, sunlit",
                  body: "16 quick questions about who you are, what you practice, and what you're looking for. Photos + one selfie verification.",
                },
                {
                  n: 2,
                  title: "Discover, on your terms",
                  img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80&auto=format&fit=crop",
                  alt: "World map with pins, evoking a global community",
                  body: "Browse curated profiles, filter by faith + lifestyle + location, or pan the map to find your diaspora. No swipe-fatigue feed.",
                },
                {
                  n: 3,
                  title: "Match. Message. Meet.",
                  img: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80&auto=format&fit=crop",
                  alt: "Two cups of coffee on a sunlit table",
                  body: "Mutual likes unlock chat. Translation built in. Block + report in one tap if anything's off. We're here to find a partner, not a pen-pal.",
                },
              ].map(({ n, title, img, alt, body }) => (
                <StepBlock key={n} n={n} title={title} img={img} alt={alt}>
                  {body}
                </StepBlock>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════ TRUST / TIERS ════════════════════════ */}
        <section id="verified" className="px-4 sm:px-6 md:px-8 py-20 lg:py-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">
            <SectionHead
              overline="Trust"
              title="Three tiers of verification."
              body="Built around how much trust you want to invest — and how much you want to see from the other side."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-6">
              {[
                {
                  tier: "bronze" as const,
                  Icon: IdCard,
                  title: "Bronze",
                  label: "Profile verified",
                  body: "Selfie + photo cross-check. Confirms you're a real person matching your photos. Required to start matching.",
                },
                {
                  tier: "silver" as const,
                  Icon: Scan,
                  title: "Silver",
                  label: "Liveness verified",
                  body: "Three quick selfies at different angles. Confirms a real person, not a static photo. Surfaces 2.1× more replies on average.",
                },
                {
                  tier: "gold" as const,
                  Icon: ShieldCheck,
                  title: "Gold",
                  label: "ID verified",
                  body: "Government ID + face match via Stripe Identity. Highest trust signal. Your document stays with Stripe — we only see the result.",
                },
              ].map(({ tier, Icon, title, label, body }) => (
                <Card
                  key={tier}
                  tone="tier-active"
                  tier={tier}
                  className="p-6 lg:p-7 gap-4 flex-row md:flex-col items-start"
                  style={{ "--tier-color": `var(--color-${tier})` } as React.CSSProperties}
                >
                  <IconBadge tone="tier" size="xl" shape="square">
                    <Icon size={24} />
                  </IconBadge>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h3 className="text-lg font-extrabold text-(--ink) tracking-tight">{title}</h3>
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-(--ink-2)">
                      {label}
                    </span>
                    <p className="mt-2.5 text-[13px] lg:text-sm leading-[1.55] text-(--ink-2)">
                      {body}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════ QUOTE ═════════════════════════════ */}
        <section className="px-4 sm:px-6 md:px-8 py-12 lg:py-20">
          <div className="mx-auto max-w-[480px] lg:max-w-[880px]">
            <figure className="lg:text-center px-2 lg:px-6 py-12">
              <blockquote
                className="text-(--ink) font-semibold"
                style={{
                  fontSize: "clamp(22px, 2.5vw, 32px)",
                  lineHeight: 1.4,
                  letterSpacing: "-0.015em",
                }}
              >
                &ldquo;Other apps treated my observance like a niche preference.
                Ahavah is the first place I felt seen — before I&apos;d even
                written a bio.&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 lg:justify-center not-italic">
                <div className="size-11 rounded-full overflow-hidden shrink-0 bg-(--card)">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&q=80&auto=format&fit=crop"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-semibold text-(--ink)">Devorah, beta tester</div>
                  <div className="text-[13px] text-(--ink-2)">Brooklyn → Jerusalem · matched in week 3</div>
                </div>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ═══════════════════════════ CTA BAND ═══════════════════════════ */}
        <section className="px-4 sm:px-6 md:px-8 pt-4 pb-20 lg:pb-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">
            <div
              className="relative overflow-hidden rounded-[28px] lg:rounded-[36px] px-7 py-10 lg:px-16 lg:py-20 text-center text-white"
              style={{ background: CTA_GRADIENT }}
            >
              {/* Brand-mark watermark — bottom-right, -12deg. Mobile keeps
                  the mark ~90% in-frame at -bottom-[6%] / -right-[6%];
                  lg+ uses the design's deeper -28% / -10% offsets that work
                  on a wider band without losing the mark. */}
              <LogoMark
                className="pointer-events-none absolute -bottom-[6%] -right-[6%] w-[55%] lg:-bottom-[28%] lg:-right-[10%] lg:w-[60%] max-w-[560px] h-auto -rotate-12 opacity-[0.16]"
                aria-hidden="true"
              />

              <span className="block mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 relative z-1">
                Limited founding-member spots
              </span>
              <h2
                className="m-0 relative z-1"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(36px, 5vw, 72px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.02em",
                  fontWeight: 400,
                }}
              >
                Built across borders. Built for you.
              </h2>
              <p className="relative z-1 mt-4 mb-8 mx-auto max-w-[540px] text-[15px] lg:text-[17px] leading-[1.55] text-white/85">
                Join 12,400+ Torah-observant singles waiting for launch. Founding
                members get six months of Premium free.
              </p>
              <Button
                tone="cta"
                size="cta"
                onClick={scrollToForm}
                className="relative z-1 inline-flex w-auto px-7"
              >
                Reserve my spot
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* ════════════════════════════ FOOTER ══════════════════════════════ */}
      <MarketingFooter />

      {/* ══════════════════════ Mobile sticky bottom CTA ═══════════════════ */}
      <LandingStickyCta targetId="waitlist" />
    </div>
  );
}

/* ═══════════════════════════ Sub-components ════════════════════════════════ */

function SectionHead({ overline, title, body }: { overline: string; title: string; body: string }) {
  return (
    <header className="flex flex-col lg:items-center lg:text-center max-w-[820px] mx-auto mb-12 lg:mb-16">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
        {overline}
      </span>
      <h2
        className="mt-3 text-(--ink)"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(36px, 9vw, 76px)",
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        {title}
      </h2>
      <p className="mt-4 lg:mt-6 max-w-[640px] text-base lg:text-lg leading-[1.6] text-(--ink-2)">
        {body}
      </p>
    </header>
  );
}

/* ── FeatureCard — design has 6 distinct tones. Three (lavender/pink/success)
   exist as IconBadge tones; the other three (lime tint, indigo, gold tint)
   are achieved via className overrides on the IconBadge primitive. tailwind-
   merge resolves the bg + text utility precedence. */
type FeatureTone = "lavender" | "lime" | "pink" | "success" | "indigo" | "gold";

const FEATURE_TONE: Record<FeatureTone, { extra: string; nativeTone?: never } | { nativeTone: "brand" | "destructive" | "success"; extra?: never }> = {
  lavender: { nativeTone: "brand" },
  pink:     { nativeTone: "destructive" },
  success:  { nativeTone: "success" },
  lime:     { extra: "bg-lime/15 text-lime" },
  indigo:   { extra: "bg-indigo/15 text-indigo" },
  gold:     { extra: "bg-gold/25 text-gold" },
};

function FeatureCard({
  tone,
  Icon,
  title,
  children,
}: {
  tone: FeatureTone;
  Icon: typeof Heart;
  title: string;
  children: React.ReactNode;
}) {
  const cfg = FEATURE_TONE[tone];
  const badge = "extra" in cfg ? (
    <IconBadge size="xl" shape="square" className={cfg.extra}>
      <Icon size={24} />
    </IconBadge>
  ) : (
    <IconBadge tone={cfg.nativeTone} size="xl" shape="square">
      <Icon size={24} />
    </IconBadge>
  );

  return (
    <Card tone="elevated" className="p-6 lg:p-8 gap-4 flex-row sm:flex-col items-start rounded-[22px] lg:rounded-[28px]">
      {badge}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <h3 className="text-[17px] lg:text-xl font-bold text-(--ink) tracking-tight">{title}</h3>
        <p className="text-sm lg:text-[15px] leading-[1.55] text-(--ink-2)">{children}</p>
      </div>
    </Card>
  );
}

/* ── StepBlock — design has DIFFERENT mobile vs desktop layouts:
   - Mobile: grid [44px badge | title+body], media tile spans both cols below
   - Desktop: vertical stack — badge, media (4:3), h3, p
   Achieved with responsive grid + reordering. */
function StepBlock({
  n,
  title,
  img,
  alt,
  children,
}: {
  n: number;
  title: string;
  img: string;
  alt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid lg:flex grid-cols-[44px_1fr] lg:flex-col gap-x-4 gap-y-2 lg:gap-y-5 items-start">
      {/* Badge — col 1 mobile / first item desktop */}
      <span
        aria-hidden
        className="row-span-2 lg:row-auto inline-grid place-items-center size-11 rounded-xl bg-[#0F0B1F] text-(--color-lime) font-extrabold text-lg shrink-0"
      >
        {n}
      </span>

      {/* Title — col 2 mobile (above body) / after media desktop */}
      <h3 className="lg:order-3 self-start lg:self-auto text-[19px] lg:text-[22px] font-bold text-(--ink) tracking-tight">
        {title}
      </h3>

      {/* Body — col 2 mobile (below title) / last desktop */}
      <p className="lg:order-4 text-[14px] lg:text-[15px] leading-[1.6] text-(--ink-2)">
        {children}
      </p>

      {/* Media — spans both cols mobile (below text) / second desktop (above title) */}
      <div className="col-span-2 lg:col-span-1 lg:order-2 mt-2 lg:mt-0 aspect-[16/10] lg:aspect-[4/3] overflow-hidden rounded-[20px] lg:rounded-[28px] bg-(--card) border border-(--hairline) shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        <img
          src={img}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

/* ── CardStack (mobile hero visual) — three layered profile photo cards with
   a lime "like" badge. Pure layout component; the photos are decorative. */
function CardStack({ className = "" }: { className?: string }) {
  const cards = [
    {
      key: 3,
      src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80&auto=format&fit=crop",
      classes: "rotate-[-7deg] translate-y-2 scale-[0.93] brightness-[0.92] z-1",
    },
    {
      key: 2,
      src: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&q=80&auto=format&fit=crop",
      classes: "rotate-[4deg] translate-y-1 scale-[0.96] brightness-[0.96] z-2",
    },
  ];
  return (
    <div
      className={`relative w-full max-w-[320px] mx-auto aspect-[3/4] ${className}`}
      aria-hidden="true"
    >
      {cards.map(({ key, src, classes }) => (
        <div
          key={key}
          className={`absolute inset-0 rounded-[28px] overflow-hidden border-4 border-white bg-(--card) shadow-[0_20px_50px_rgba(15,11,31,0.20)] ${classes}`}
        >
          <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
        </div>
      ))}

      {/* Top card with caption */}
      <div className="absolute inset-0 rounded-[28px] overflow-hidden border-4 border-white bg-(--card) shadow-[0_20px_50px_rgba(15,11,31,0.20)] rotate-[-1deg] z-3">
        <img
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80&auto=format&fit=crop"
          alt=""
          loading="eager"
          className="w-full h-full object-cover"
        />
        <div className="absolute left-4 right-4 bottom-3.5 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
          <div className="text-[18px] font-bold">Yael, 27</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs opacity-90">
            <MapPin size={10} />
            Jerusalem, IL
          </div>
        </div>
      </div>

      {/* "Like" badge — lime circle, top-right, rotated, on top of all cards */}
      <div className="absolute -top-2.5 -right-2.5 z-4 size-14 rounded-full bg-lime rotate-12 grid place-items-center shadow-[0_6px_18px_rgba(215,255,129,0.5)]">
        <Heart size={26} fill="#000" stroke="none" />
      </div>
    </div>
  );
}

/* ── PhoneMockup (desktop hero visual) — phone-in-mockup with floating cards.
   Closely matches the desktop design's `.phone-stack` block. */
function PhoneMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full max-w-[480px] aspect-[1/1.05] ${className}`} aria-hidden="true">
      {/* Floating profile cards */}
      <FloatCard
        src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80&auto=format&fit=crop"
        className="top-[6%] left-[4%] -rotate-[10deg] w-[100px]"
      />
      <FloatCard
        src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop"
        className="bottom-[8%] right-[2%] rotate-[12deg] w-[100px]"
      />
      <FloatCard
        src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&q=80&auto=format&fit=crop"
        className="bottom-[16%] left-0 rotate-[8deg] w-[80px]"
      />
      <FloatCard
        src="https://images.unsplash.com/photo-1463453091185-61582044d556?w=180&q=80&auto=format&fit=crop"
        className="top-[14%] right-[6%] -rotate-[6deg] w-[86px]"
      />

      {/* Phone shell */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[290px] aspect-[9/19] rounded-[40px] border-8 border-[#0F0B1F] bg-[oklch(0.18_0.11_280)] p-3 overflow-hidden shadow-[0_30px_80px_rgba(15,11,31,0.30)]">
        <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-[oklch(0.18_0.11_280)] text-white flex flex-col">
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[90px] h-6 rounded-[14px] bg-black z-5" />

          {/* App header */}
          <div className="flex items-center justify-between px-4 pt-11 pb-2">
            <Logo variant="horizontal" forceTheme="dark" height={22} />
            <div className="size-[30px] rounded-full grid place-items-center bg-[oklch(0.13_0.06_280)]">
              <Sliders size={14} stroke="oklch(0.71 0.16 295)" />
            </div>
          </div>

          {/* Profile card */}
          <div className="flex-1 mx-3 mt-2 mb-3 rounded-[18px] overflow-hidden relative">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop"
              alt=""
              loading="eager"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute top-3.5 left-3.5 right-3.5 flex gap-1">
              <span className="flex-1 h-[3px] rounded-[2px] bg-lime shadow-[0_0_6px_rgba(215,255,129,0.5)]" />
              <span className="flex-1 h-[3px] rounded-[2px] bg-white/20" />
              <span className="flex-1 h-[3px] rounded-[2px] bg-white/20" />
            </div>
            <div className="relative z-2 mt-auto bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3.5">
              <div className="text-[17px] font-bold">Yael, 27</div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-white/85">
                <MapPin size={10} />
                Jerusalem, IL
              </div>
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-center gap-3.5 pb-3.5">
            <div className="size-10 rounded-full grid place-items-center bg-lavender shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <XIcon size={16} strokeWidth={2.4} className="text-black" />
            </div>
            <div className="size-[50px] rounded-full grid place-items-center bg-lime shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <PlayIcon size={20} fill="#000" stroke="none" />
            </div>
            <div className="size-10 rounded-full grid place-items-center bg-pink shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <Heart size={16} fill="#fff" stroke="none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatCard({ src, className }: { src: string; className: string }) {
  return (
    <div
      className={`absolute aspect-[3/4] rounded-2xl overflow-hidden border-[3px] border-white shadow-[0_16px_40px_rgba(15,11,31,0.25)] bg-(--card) ${className}`}
    >
      <img src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
    </div>
  );
}

