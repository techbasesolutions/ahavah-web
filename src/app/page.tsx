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
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  EyeOff,
  Globe,
  Heart,
  IdCard,
  Languages,
  Lock,
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
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ProgressDots } from "@/components/app/progress-dots";
import { useWaitlistCount, aboveFloor } from "@/components/app/waitlist-count";
import {
  Pill,
  PillAvatar,
  PillAvatarGroup,
  PillIndicator,
} from "@/components/kibo-ui/pill";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";
import { postWaitlist } from "@/lib/waitlist";

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
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const formInputRef = useRef<HTMLInputElement>(null);
  const waitlistCount = useWaitlistCount();

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
    try {
      localStorage.setItem(WAITLIST_STORAGE_KEY, trimmed);
      sessionStorage.setItem(PENDING_EMAIL_KEY, trimmed);
    } catch {
      /* storage unavailable */
    }
    // Best-effort early capture; route to the full form regardless of result
    // (the form's own submit creates/updates the row).
    try {
      await postWaitlist(trimmed);
    } catch {
      /* the /waitlist form will create the row */
    }
    setSubmitting(false);
    router.push(`/waitlist?email=${encodeURIComponent(trimmed)}`);
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
                    Summer 2026
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
                  Find a spouse
                  <br />
                  across{" "}
                  <span className="whitespace-nowrap">
                    borders<span className="inline-block text-(--color-lime) translate-y-[0.04em]">.</span>
                  </span>
                </h1>

                <p className="mt-6 lg:mt-7 max-w-[540px] text-[17px] lg:text-[21px] leading-[1.55] text-(--ink-2)">
                  Verified profiles, 100+ languages, real connections. The
                  matchmaking platform for Messianic Torah-observant believers,
                  here to help you meet a future spouse.
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
                <div className="mt-14 flex flex-wrap items-start gap-x-9 gap-y-6 max-w-[520px]" aria-label="Pre-launch interest">
                  {[
                    aboveFloor(waitlistCount)
                      ? { num: waitlistCount.toLocaleString(), suffix: "", lbl: "on the waitlist" }
                      : { num: "Founding", suffix: "", lbl: "members welcome" },
                    { num: "Worldwide", suffix: "",  lbl: "diaspora reach" },
                    { num: "100",       suffix: "+", lbl: "languages"      },
                  ].map(({ num, suffix, lbl }) => (
                    <div key={lbl}>
                      <div
                        className="whitespace-nowrap text-(--ink) tabular-nums"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(22px, 2.2vw, 32px)",
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

        {/* ═══════════════════════ WHO IT'S FOR ═══════════════════════ */}
        <section id="who" className="px-4 sm:px-6 md:px-8 py-20 lg:py-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[940px]">
            <SectionHead
              overline="Who it's for"
              title="Built for believers who take it seriously."
              body="Ahavah is a set-apart space for people seriously seeking marriage. We're here to grow legacy, build covenant love, raise families in the truth, and strengthen Torah-based communities and family structures. Not a numbers game. A remnant."
            />

            <Card
              tone="elevated"
              className="relative overflow-hidden rounded-[28px] lg:rounded-[36px] p-8 lg:p-14 gap-0 ring-1 ring-(--hairline)"
            >
              {/* brand-canvas glows */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full blur-3xl"
                style={{ background: "color-mix(in oklch, var(--color-lavender) 26%, transparent)" }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -left-20 -bottom-24 size-72 rounded-full blur-3xl"
                style={{ background: "color-mix(in oklch, var(--color-lime) 20%, transparent)" }}
              />

              {/* Contrast statement — what Ahavah is NOT, then what it is. */}
              <div className="relative z-10 flex flex-col gap-3 lg:gap-4">
                <p
                  className="text-(--ink-3)"
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(19px, 3vw, 28px)", lineHeight: 1.12, fontWeight: 400 }}
                >
                  <span className="line-through decoration-2">Not mainstream Christian dating.</span>{" "}
                  <span className="line-through decoration-2">Not secular dating.</span>
                </p>
                <p
                  className="text-(--ink)"
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.6vw, 48px)", lineHeight: 1.04, letterSpacing: "-0.02em", fontWeight: 400 }}
                >
                  This is <span className="text-(--color-lavender)">Torah-observant dating</span> for serious believers.
                </p>
              </div>

              <Separator className="relative z-10 my-8 lg:my-10" />

              {/* Covenant values */}
              <div className="relative z-10 grid gap-5 sm:grid-cols-3 sm:gap-7">
                {[
                  "Built for Messianic Torah-observant believers",
                  "Aligned in Torah, faith, family, and covenant values",
                  "For believers who take Torah, marriage, and family seriously",
                ].map((v) => (
                  <div key={v} className="flex items-start gap-3">
                    <IconBadge tone="cta" size="sm" shape="circle">
                      <Check size={14} strokeWidth={3} />
                    </IconBadge>
                    <span className="text-[14px] lg:text-[15px] leading-[1.5] text-(--ink-2)">{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <p className="mt-8 text-center text-[14px] text-(--ink-3)">
              Modesty matters here, in conduct and in photos.{" "}
              <Link
                href="/legal/community-guidelines"
                prefetch={false}
                className="font-semibold text-(--color-lavender) underline-offset-2 hover:underline"
              >
                See our guidelines
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ═══════════════════════════ FEATURES ═══════════════════════════ */}
        <section id="features" className="px-4 sm:px-6 md:px-8 py-20 lg:py-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">
            <SectionHead
              overline="What's different"
              title="A platform that respects who you are."
              body="Built around real-world commitments: Shabbat, calendar, family. So your first message isn't a 20-question screener."
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
                our community speaks, from Hebrew to Yoruba to Tagalog.
              </FeatureCard>
              <FeatureCard tone="pink"          Icon={Heart}          title="Faith-aware filters">
                Calendar (lunar/solar), assembly, Torah level, polygyny stance —
                all first-class filters. Find a spouse whose practice fits yours.
              </FeatureCard>
              <FeatureCard tone="success"       Icon={SparklesIcon}  title="Real compatibility">
                9-axis compatibility scoring — observance, language, family,
                relocation, lifestyle. Surface people you actually align with.
              </FeatureCard>
              <FeatureCard tone="indigo"        Icon={MapPin}         title="Diaspora map">
                See your community geographically. Pan to a region, find people
                there. Useful for traveling, relocating, or finding home.
              </FeatureCard>
              <FeatureCard tone="gold"          Icon={IdCard}         title="Privacy by design">
                Hide from map. Require verified matches. Block + report in one
                tap. We never share your government ID with other users.
              </FeatureCard>
            </div>
          </div>
        </section>

        {/* ═══════════════════ FEATURES — SIX-SCREEN SLIDER ═══════════════════ */}
        <section id="how" className="px-4 sm:px-6 md:px-8 py-20 lg:py-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">
            <SectionHead
              overline="The experience"
              title="Everything Ahavah does."
              body="Six screens that carry the whole journey, from your first verified profile to a community spread across the diaspora."
            />
            <FeatureSlider />
          </div>
        </section>

        {/* ═════════════════════════ TRUST / TIERS ════════════════════════ */}
        <section id="verified" className="px-4 sm:px-6 md:px-8 py-20 lg:py-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">
            <SectionHead
              overline="Trust"
              title="Three tiers of verification."
              body="Built around how much trust you want to invest, and how much you want to see from the other side."
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
                  body: "Government ID + face match via Stripe Identity. Highest trust signal. Your document stays with Stripe. We only see the result.",
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

            {/* Privacy principles — verification done responsibly */}
            <div className="mt-16 lg:mt-20">
              <div className="mb-9 flex flex-col items-center text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
                  Privacy by design
                </span>
                <h3
                  className="mt-2.5 text-(--ink)"
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3.4vw, 38px)", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 400 }}
                >
                  Verification you can trust.
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-6">
                {[
                  {
                    Icon: ShieldCheck,
                    badge: "bg-lavender/12 text-lavender",
                    glow: "var(--color-lavender)",
                    title: "Verification is for safety",
                    body: "We confirm real people to keep predators and catfish out. Not surveillance. Not data harvesting.",
                  },
                  {
                    Icon: Lock,
                    badge: "bg-success/12 text-success",
                    glow: "#10b981",
                    title: "Minimal data retention",
                    body: "ID and selfie checks are processed, not stockpiled. Your government ID stays with our verification provider (Stripe Identity). We keep only the pass or fail result.",
                  },
                  {
                    Icon: EyeOff,
                    badge: "bg-gold/20 text-gold",
                    glow: "var(--color-gold)",
                    title: "Never public",
                    body: "Your verification photos and ID are never shown to other users and never posted anywhere. Sensitive data is not exposed.",
                  },
                ].map(({ Icon, badge, glow, title, body }) => (
                  <Card
                    key={title}
                    tone="elevated"
                    className="relative overflow-hidden p-6 lg:p-7 gap-3 items-start rounded-[22px] lg:rounded-[28px]"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full blur-3xl"
                      style={{ background: `color-mix(in oklch, ${glow} 22%, transparent)` }}
                    />
                    <IconBadge size="xl" shape="square" className={`relative z-10 ${badge}`}>
                      <Icon size={22} />
                    </IconBadge>
                    <h3 className="relative z-10 text-[16px] lg:text-[17px] font-bold text-(--ink) tracking-tight">{title}</h3>
                    <p className="relative z-10 text-sm leading-[1.55] text-(--ink-2)">{body}</p>
                  </Card>
                ))}
              </div>
            </div>
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
                Join the remnant of Torah-observant believers waiting for launch.
                Founding members get six months of Premium free.
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

/* ── FeatureSlider — the canonical "Ahavah Marketing Screens" feature deck
   rebuilt as LIVE kit components (not pictures of the slides). Each slide keeps
   the canonical signature — an overline, a heavy display headline with one
   accent-coloured phrase, a caption, and the canonical floating chip rendered
   as a real kit Pill — so it stays theme-adaptive and selectable. Light slides
   sit on the themed Card surface with a deep accent; the two "global" slides
   (Map, Community) keep the canonical dark surface so their lime/gold accents
   pop. Swipe everywhere, arrows on desktop, ProgressDots indicator. */
type SlideTone = "lavender" | "lime" | "pink" | "indigo" | "emerald" | "gold";

// Accent text class + raw colour (for the dot + corner glow + watermark). All
// brand tokens exist in globals.css; emerald is the Tailwind default.
const SLIDE_TONE: Record<SlideTone, { text: string; color: string }> = {
  lavender: { text: "text-(--color-lavender)", color: "var(--color-lavender)" },
  lime:     { text: "text-lime",               color: "var(--color-lime)" },
  pink:     { text: "text-(--color-pink)",     color: "var(--color-pink)" },
  indigo:   { text: "text-indigo",             color: "var(--color-indigo)" },
  emerald:  { text: "text-emerald-600",        color: "#10b981" },
  gold:     { text: "text-gold",               color: "var(--color-gold)" },
};

type ChipSpec =
  | { kind: "indicator"; text: string }
  | { kind: "icon"; icon: typeof Heart; text: string }
  | { kind: "match" }
  | { kind: "avatars"; text: string };

type FeatureSlide = {
  n: string;
  category: string;
  head: string;
  accent: string;
  body: string;
  tone: SlideTone;
  dark?: boolean;
  chip: ChipSpec;
};

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    n: "01",
    category: "Discover",
    head: "Browse with ",
    accent: "intention.",
    body: "One verified profile at a time. Skip what isn't right, like what is.",
    tone: "lavender",
    chip: { kind: "indicator", text: "Verified profile" },
  },
  {
    n: "02",
    category: "Map",
    head: "Love is anywhere on ",
    accent: "earth.",
    body: "See who's nearby, or oceans away. Tap a pin, open a profile.",
    tone: "lime",
    dark: true,
    chip: { kind: "icon", icon: MapPin, text: "2,840 nearby" },
  },
  {
    n: "03",
    category: "It's a match",
    head: "When it clicks, ",
    accent: "it sparks.",
    body: "Two yeses, one moment. Then a way to actually say hello.",
    tone: "pink",
    chip: { kind: "match" },
  },
  {
    n: "04",
    category: "Chat",
    head: "Communicate with ",
    accent: "matches.",
    body: "Real-time translation in 100+ languages, built in. No copy-paste.",
    tone: "indigo",
    chip: { kind: "icon", icon: Languages, text: "עברית → English" },
  },
  {
    n: "05",
    category: "Matches & liked you",
    head: "Your people, ",
    accent: "all in one place.",
    body: "Every mutual match in a tap. See exactly who liked you with Premium.",
    tone: "emerald",
    chip: { kind: "icon", icon: Heart, text: "7 liked you" },
  },
  {
    n: "06",
    category: "Community",
    head: "For the diaspora. ",
    accent: "By the diaspora.",
    body: "A home built for Torah-observant believers worldwide, wherever you are.",
    tone: "gold",
    dark: true,
    chip: { kind: "avatars", text: "@ahavah" },
  },
];

const DARK_SLIDE_BG =
  "linear-gradient(155deg, oklch(0.22 0.09 285), oklch(0.15 0.07 285))";

function SlideChip({ slide }: { slide: FeatureSlide }) {
  const onDark = slide.dark
    ? "border-transparent bg-white/12 text-white backdrop-blur-sm"
    : "";
  switch (slide.chip.kind) {
    case "indicator":
      return (
        <Pill className={onDark}>
          <PillIndicator variant="brand" pulse />
          {slide.chip.text}
        </Pill>
      );
    case "icon": {
      const Icon = slide.chip.icon;
      return (
        <Pill className={onDark}>
          <Icon size={13} className={slide.dark ? undefined : SLIDE_TONE[slide.tone].text} />
          {slide.chip.text}
        </Pill>
      );
    }
    case "match":
      return (
        <Pill className="border-transparent bg-lime text-[#0F0B1F]">
          <Heart size={12} fill="#0F0B1F" stroke="none" />
          It&apos;s a match!
        </Pill>
      );
    case "avatars":
      return (
        <Pill className={onDark}>
          <PillAvatarGroup>
            <PillAvatar src="/marketing/avatar-1.webp" fallback="A" />
            <PillAvatar src="/marketing/avatar-2.webp" fallback="B" />
            <PillAvatar src="/marketing/avatar-3.webp" fallback="C" />
          </PillAvatarGroup>
          {slide.chip.text}
        </Pill>
      );
  }
}

function FeatureSlideCard({ slide }: { slide: FeatureSlide }) {
  const tone = SLIDE_TONE[slide.tone];
  return (
    <Card
      tone="elevated"
      className="relative h-full overflow-hidden rounded-[28px] p-7 sm:p-9 lg:p-11 min-h-[360px] sm:min-h-[400px] flex flex-col justify-between items-start gap-7 ring-1 ring-(--hairline)"
      style={slide.dark ? { background: DARK_SLIDE_BG } : undefined}
    >
      {/* accent corner glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full blur-3xl"
        style={{ background: `color-mix(in oklch, ${tone.color} ${slide.dark ? "55%" : "32%"}, transparent)` }}
      />
      {/* oversized feature numeral watermark */}
      <span
        aria-hidden
        className={`pointer-events-none absolute right-3 -bottom-8 leading-none select-none ${tone.text}`}
        style={{ fontFamily: "var(--font-display)", fontSize: "clamp(150px, 26vw, 260px)", opacity: slide.dark ? 0.16 : 0.09 }}
      >
        {slide.n}
      </span>

      <div className="relative z-10 flex flex-col gap-3.5 sm:gap-4">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
          <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
          <span className={tone.text}>
            {slide.n} · {slide.category}
          </span>
        </div>

        <h3
          className={slide.dark ? "text-white" : "text-(--ink)"}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(30px, 5.4vw, 46px)",
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            fontWeight: 400,
          }}
        >
          {slide.head}
          <span className={tone.text}>{slide.accent}</span>
        </h3>

        <p className={`text-[15px] sm:text-base leading-[1.6] max-w-[44ch] ${slide.dark ? "text-white/70" : "text-(--ink-2)"}`}>
          {slide.body}
        </p>
      </div>

      <div className="relative z-10">
        <SlideChip slide={slide} />
      </div>
    </Card>
  );
}

function FeatureSlider() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="flex flex-col items-center">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "center" }}
        className="w-full max-w-[560px] lg:max-w-[760px]"
      >
        <CarouselContent>
          {FEATURE_SLIDES.map((slide) => (
            <CarouselItem key={slide.n}>
              <FeatureSlideCard slide={slide} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden lg:flex -left-16 size-11 bg-(--card)" />
        <CarouselNext className="hidden lg:flex -right-16 size-11 bg-(--card)" />
      </Carousel>

      <ProgressDots
        count={FEATURE_SLIDES.length}
        active={selected}
        tone="lavender"
        className="mt-7"
      />
    </div>
  );
}

/* ── CardStack (mobile hero visual) — three layered profile photo cards with
   a lime "like" badge. Pure layout component; the photos are decorative. */
function CardStack({ className = "" }: { className?: string }) {
  const cards = [
    {
      key: 3,
      src: "/marketing/couple-1.webp",
      classes: "rotate-[-7deg] translate-y-2 scale-[0.93] brightness-[0.92] z-1",
    },
    {
      key: 2,
      src: "/marketing/couple-2.webp",
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
          src="/marketing/woman-1.webp"
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
        src="/marketing/couple-3.webp"
        className="top-[6%] left-[4%] -rotate-[10deg] w-[100px]"
      />
      <FloatCard
        src="/marketing/couple-4.webp"
        className="bottom-[8%] right-[2%] rotate-[12deg] w-[100px]"
      />
      <FloatCard
        src="/marketing/couple-5.webp"
        className="bottom-[16%] left-0 rotate-[8deg] w-[80px]"
      />
      <FloatCard
        src="/marketing/couple-6.webp"
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
              src="/marketing/avatar-2.webp"
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

