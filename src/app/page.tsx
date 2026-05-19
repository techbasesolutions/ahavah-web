"use client";

// Marketing landing uses raw <img> for Unsplash-hosted photos.
// next/image requires width/height + remote-pattern config for images.unsplash.com;
// the efficiency gain is marginal on a landing with decorative imagery.
/* eslint-disable @next/next/no-img-element */
// Inline styles are required for: CSS variable references (--font-display,
// --tier-color), complex gradients with color-mix()/oklch, and clamp() font
// sizes. Same trade-off as auth-illustration.tsx — cannot express these in
// Tailwind utilities without losing the dynamic/functional semantics.
/* eslint-disable no-restricted-syntax */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { Pill } from "@/components/kibo-ui/pill";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";

const WAITLIST_STORAGE_KEY = "ahavah.waitlist.email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Brand canvas: 4 radial color-mix gradients layered over --app.
// Uses oklch + color-mix() — not expressible as Tailwind utilities.
const BRAND_CANVAS = `
  radial-gradient(ellipse 70% 30% at 10% 8%, color-mix(in oklch, var(--color-lavender) 32%, transparent), transparent 70%),
  radial-gradient(ellipse 60% 30% at 90% 95%, color-mix(in oklch, var(--color-lime) 38%, transparent), transparent 70%),
  radial-gradient(ellipse 70% 30% at 85% 35%, color-mix(in oklch, var(--color-pink) 22%, transparent), transparent 70%),
  radial-gradient(ellipse 60% 30% at 15% 70%, color-mix(in oklch, var(--color-lavender) 22%, transparent), transparent 70%),
  var(--app)
`.trim();

export default function LandingPage() {
  const router = useRouter();
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

  // Don't block on `checking` — see previous comment. Signed-in users see one
  // frame of landing before the redirect; preferable to a blank flash.
  void checking;

  return (
    <div
      data-landing
      className="min-h-dvh font-sans text-(--ink)"
      style={{ background: BRAND_CANVAS }}
    >

      {/* ═══════════════════════════════ NAV ══════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-(--hairline) bg-(--app)">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Ahavah home" className="shrink-0">
            <Logo variant="horizontal" height={30} priority />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-(--ink-2)" aria-label="Primary">
            <a href="#how" className="hover:text-(--ink) transition-colors">How it works</a>
            <a href="#features" className="hover:text-(--ink) transition-colors">Features</a>
            <a href="#verified" className="hover:text-(--ink) transition-colors">Verified</a>
            <Link href="/help" className="hover:text-(--ink) transition-colors">FAQ</Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle variant="icon" />
            <Button
              render={<Link href="/auth/sign-in" prefetch={false} />}
              variant="outlineSubtle"
              size="sm"
            >
              Sign in
            </Button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <section className="px-4 sm:px-6 pt-12 pb-16 md:pt-20 md:pb-28" id="waitlist">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">

            {/* Left — copy + form + stats */}
            <div>
              {/* Eyebrow */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Pill variant="lavender">Pre-launch</Pill>
                <span className="text-xs font-semibold tracking-widest uppercase text-(--ink-3)">
                  Spring 2026 · Invite only
                </span>
              </div>

              {/* Headline */}
              <h1
                className="font-black leading-[1.05] tracking-tight mb-5 text-(--ink)"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(34px, 7vw, 76px)",
                }}
              >
                Find love
                <br />
                across borders<span className="text-(--color-lime)">.</span>
              </h1>

              <p className="text-base md:text-lg text-(--ink-2) leading-relaxed mb-8 max-w-lg">
                Verified profiles, 100+ languages, real connections. The dating
                app built for Torah-observant singles who don&apos;t fit anywhere else.
              </p>

              {/* Waitlist form */}
              <form onSubmit={handleSubmit} noValidate className="mb-3">
                <div className="flex flex-col sm:flex-row gap-3">
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
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    tone="cta"
                    size="lg"
                    disabled={submitting}
                    {...(submitting ? { "aria-busy": "true" as const } : {})}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    {submitting ? "Saving…" : "Get early access"}
                    {!submitting && <ArrowRight size={18} strokeWidth={2.4} />}
                  </Button>
                </div>
              </form>

              <p id="waitlist-helper" className="flex items-center gap-1.5 text-xs text-(--ink-3) mb-1">
                <ShieldCheck size={13} />
                No spam. We email when launch is close. Unsubscribe anytime.
              </p>
              {msg && (
                <p
                  id="waitlist-msg"
                  role="status"
                  aria-live="polite"
                  className={`text-sm mt-1 ${
                    msg.kind === "error"
                      ? "text-(--color-pink)"
                      : "text-(--color-lime)"
                  }`}
                >
                  {msg.text}
                </p>
              )}

              {/* Stats */}
              <div
                className="grid grid-cols-3 gap-3 mt-8 pt-8 border-t border-(--hairline)"
                aria-label="Pre-launch interest"
              >
                {[
                  { num: "12,400", suffix: "+", lbl: "on the waitlist" },
                  { num: "63",     suffix: "",  lbl: "countries"       },
                  { num: "100",    suffix: "+", lbl: "languages"       },
                ].map(({ num, suffix, lbl }) => (
                  <div key={lbl} className="text-center min-w-0">
                    <div
                      className="font-black text-(--ink) tabular-nums"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(18px, 4.5vw, 26px)",
                      }}
                    >
                      {num}
                      <span className="text-(--color-lime)">{suffix}</span>
                    </div>
                    <div className="text-[11px] text-(--ink-3) mt-0.5 leading-tight">
                      {lbl}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — phone mockup, desktop only (lg:+, not md:). The 2-column
                hero kicks in at lg so the form + stats keep the full mobile
                width on tablets, and the phone never crowds the stats below
                the form on narrow viewports. */}
            <div className="hidden lg:flex justify-center items-center" aria-hidden="true">
              <PhoneMockup />
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════ FEATURES ══════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 md:py-24" id="features">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            overline="What's different"
            title="A dating app that respects who you are."
            body="Built around real-world commitments — Shabbat, kashrut, calendar, family. So your first message isn't a 20-question screener."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard tone="brand"       Icon={ShieldCheck}  title="Verified profiles">
              Every member completes selfie verification before they can match.
              Optional silver + gold tiers add liveness + government-ID checks.
            </FeatureCard>
            <FeatureCard tone="cta"         Icon={Globe}         title="100+ languages">
              Match across borders. Live translation in chat for the languages
              our community speaks — from Hebrew to Yoruba to Tagalog.
            </FeatureCard>
            <FeatureCard tone="destructive" Icon={Heart}         title="Faith-aware filters">
              Calendar (lunar/solar), assembly, Torah level, polygyny stance —
              all first-class filters. Find someone whose practice fits yours.
            </FeatureCard>
            <FeatureCard tone="success"     Icon={SparklesIcon} title="Real compatibility">
              9-axis compatibility scoring — observance, language, family,
              relocation, lifestyle. Surface people you actually align with.
            </FeatureCard>
            <FeatureCard tone="elevated"    Icon={MapPin}        title="Diaspora map">
              See your community geographically. Pan to a region, find people
              there — useful for traveling, relocating, or finding home.
            </FeatureCard>
            <FeatureCard tone="muted"       Icon={IdCard}        title="Privacy by design">
              Hide from map. Require verified matches. Block + report in one
              tap. We never share your government ID with other users.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ HOW IT WORKS ═════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 md:py-24" id="how">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            overline="How it works"
            title="Three steps to your first conversation."
            body="Designed to get you talking with real people fast — without the endless onboarding spiral most apps make you suffer through."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                n: 1,
                title: "Build your profile",
                img: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800&q=80&auto=format&fit=crop",
                body: "16 quick questions about who you are, what you practice, and what you're looking for. Photos + one selfie verification.",
              },
              {
                n: 2,
                title: "Discover, on your terms",
                img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80&auto=format&fit=crop",
                body: "Browse curated profiles, filter by faith + lifestyle + location, or pan the map to find your diaspora. No swipe-fatigue feed.",
              },
              {
                n: 3,
                title: "Match. Message. Meet.",
                img: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80&auto=format&fit=crop",
                body: "Mutual likes unlock chat. Translation built in. Block + report in one tap if anything's off. We're here to find a partner, not a pen-pal.",
              },
            ].map(({ n, title, img, body }) => (
              <Card key={n} tone="elevated" className="overflow-hidden p-0 gap-0 rounded-2xl">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex flex-col gap-2.5">
                  {/* Step badge — 44×44 indigo tile with lime number,
                      separate from the photo (canonical landing pattern;
                      do NOT overlay the number on the image). */}
                  <span
                    aria-hidden
                    className="inline-grid place-items-center size-11 rounded-xl bg-[#0F0B1F] text-(--color-lime) font-extrabold text-lg shrink-0"
                  >
                    {n}
                  </span>
                  <h3 className="font-bold text-(--ink)">{title}</h3>
                  <p className="text-sm text-(--ink-2) leading-relaxed">{body}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ TRUST / TIERS ════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 md:py-24" id="verified">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            overline="Trust"
            title="Three tiers of verification."
            body="Built around how much trust you want to invest — and how much you want to see from the other side."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(
              [
                {
                  // Canonical tier hex from landing.css `.landing-tier--bronze`.
                  // Not theme-aware — the same metal tone in both light and
                  // dark mode (matches the original handoff).
                  tier: "bronze" as const,
                  color: "#CD7F32",
                  Icon: IdCard,
                  title: "Bronze",
                  label: "Profile verified",
                  body: "Selfie + photo cross-check. Confirms you're a real person matching your photos. Required to start matching.",
                },
                {
                  tier: "silver" as const,
                  color: "#C0C0C0",
                  Icon: Scan,
                  title: "Silver",
                  label: "Liveness verified",
                  body: "Three quick selfies at different angles. Confirms a real person, not a static photo. Surfaces 2.1× more replies on average.",
                },
                {
                  tier: "gold" as const,
                  color: "#FFD700",
                  Icon: ShieldCheck,
                  title: "Gold",
                  label: "ID verified",
                  body: "Government ID + face match via Stripe Identity. Highest trust signal. Your document stays with Stripe — we only see the result.",
                },
              ] as const
            ).map(({ tier, color, Icon, title, label, body }) => (
              <Card
                key={tier}
                tone="tier-active"
                tier={tier}
                className="p-6 gap-4 rounded-3xl"
                style={{ "--tier-color": color } as React.CSSProperties}
              >
                <IconBadge tone="tier" size="xl" shape="square">
                  <Icon size={24} />
                </IconBadge>
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-bold text-(--ink) text-lg">{title}</h3>
                  <span className="text-xs font-semibold tracking-widest uppercase text-(--ink-3)">
                    {label}
                  </span>
                </div>
                <p className="text-sm text-(--ink-2) leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ QUOTE ════════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Card tone="elevated" className="p-8 md:p-12 rounded-3xl gap-6">
            <blockquote
              className="text-xl md:text-2xl font-medium text-(--ink) leading-relaxed"
            >
              &ldquo;Other apps treated my observance like a niche preference.
              Ahavah is the first place I felt seen — before I&apos;d even
              written a bio.&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-4 not-italic">
              <div className="size-12 rounded-full overflow-hidden shrink-0 ring-2 ring-(--hairline)">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&q=80&auto=format&fit=crop"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-semibold text-(--ink) text-sm">Devorah, beta tester</div>
                <div className="text-xs text-(--ink-3) mt-0.5">Brooklyn → Jerusalem · matched in week 3</div>
              </div>
            </figcaption>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════ CTA BAND ═════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div
            className="relative overflow-hidden rounded-3xl px-8 py-14 md:px-16 md:py-20 text-center"
            style={{
              background:
                "linear-gradient(135deg, #0E0040 0%, #1e0a6e 45%, #5524F5 100%)",
              boxShadow:
                "0 8px 32px -4px rgba(85,36,245,0.30), 0 2px 8px -2px rgba(15,11,31,0.15)",
            }}
          >
            {/* Watermark brand mark — anchored top-center, rotated -12deg,
                55% of band width capped at 450px, opacity 0.18 (matches the
                original landing.css `.landing-cta-band__mark` exactly). */}
            <svg
              className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -rotate-12 opacity-[0.18]"
              style={{ width: "55%", maxWidth: 450 }}
              viewBox="0 0 145 145"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 30C0 13.4315 13.4315 0 30 0H115C131.569 0 145 13.4315 145 30V115C145 131.569 131.569 145 115 145H30C13.4315 145 0 131.569 0 115V30Z"
                fill="#D7FF81"
              />
              <path
                d="M67.069 22.1557C75.347 21.4108 83.9739 23.3815 91.3472 27.1513C102.271 32.7295 110.518 42.4341 114.263 54.1139C119.875 71.6064 115.939 84.4881 108.021 99.9057C114.131 101.503 116.562 101.805 122.621 103.006C122.868 105.814 123.411 112.51 121.744 114.594C117.352 120.083 102.839 114.492 98.4074 111.121C94.8173 114.265 90.8488 116.952 86.5938 119.115C70.3696 127.268 47.0932 126.768 33.5704 113.74C23.909 104.43 21.8713 92.3889 26.0698 80.0464C27.1337 77.7176 28.5113 75.545 30.1643 73.5896C39.3326 62.7519 55.283 61.7426 67.3643 67.8735C74.2378 71.3616 78.4795 76.5341 83.8379 81.8093C87.7388 85.6671 91.7937 89.3659 95.9928 92.8968C101.077 84.114 103.535 75.6881 102.099 65.4442C98.922 42.7866 75.0323 29.299 54.7695 41.5052C49.6509 44.5885 46.69 49.36 43.2145 54.0613C37.0916 52.2594 35.0503 51.5212 30.1422 47.6823C36.9186 32.0588 50.7891 24.3034 67.069 22.1557Z"
                fill="#0E0040"
              />
              <path
                d="M51.0994 79.1284C63.9406 78.736 68.7648 86.5444 76.9674 94.8518C80.1397 98.0646 82.5948 100.248 86.1238 103.074C81.6122 105.701 78.2704 107.378 73.3248 108.984C64.2836 111.196 52.9018 110.421 45.3923 104.615C39.6893 100.204 35.4202 90.5244 40.5523 84.1588C43.3664 80.6685 46.8505 79.6312 51.0994 79.1284Z"
                fill="#D7FF81"
              />
            </svg>

            <span className="text-xs font-semibold tracking-widest uppercase text-white/70 block mb-4">
              Limited founding-member spots
            </span>
            <h2
              className="font-bold text-white mb-4"
              style={{ fontSize: "clamp(26px, 4vw, 40px)" }}
            >
              Built across borders. Built for you.
            </h2>
            <p className="text-white/75 max-w-lg mx-auto mb-8 text-base">
              Join 12,400+ Torah-observant singles waiting for launch.
              Founding members get six months of Premium free.
            </p>
            <Button
              tone="cta"
              size="lg"
              onClick={() => {
                router.replace("/#waitlist");
                formInputRef.current?.focus();
              }}
            >
              Reserve my spot
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ FOOTER ════════════════════════════ */}
      <footer className="bg-[#0F0B1F] text-white/80 px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <Logo variant="horizontal" forceTheme="dark" height={30} />
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                Find love across borders. Verified profiles, 100+ languages,
                real connections. Made for the diaspora.
              </p>
            </div>

            {/* Product */}
            <nav className="flex flex-col gap-2 text-sm" aria-label="Product links">
              <h4 className="font-semibold text-white mb-1">Product</h4>
              <a href="#features" className="text-white/50 hover:text-white transition-colors">Features</a>
              <a href="#how"      className="text-white/50 hover:text-white transition-colors">How it works</a>
              <a href="#verified" className="text-white/50 hover:text-white transition-colors">Verification</a>
              <a href="#waitlist" className="text-white/50 hover:text-white transition-colors">Join waitlist</a>
            </nav>

            {/* Company */}
            <nav className="flex flex-col gap-2 text-sm" aria-label="Company links">
              <h4 className="font-semibold text-white mb-1">Company</h4>
              <Link href="/help"                       className="text-white/50 hover:text-white transition-colors">Help</Link>
              <a    href="mailto:admin@ahavah.app"     className="text-white/50 hover:text-white transition-colors">Contact</a>
              <Link href="/legal/community-guidelines" className="text-white/50 hover:text-white transition-colors">Community</Link>
            </nav>

            {/* Legal */}
            <nav className="flex flex-col gap-2 text-sm" aria-label="Legal links">
              <h4 className="font-semibold text-white mb-1">Legal</h4>
              <Link href="/legal/terms"                className="text-white/50 hover:text-white transition-colors">Terms of service</Link>
              <Link href="/legal/privacy"              className="text-white/50 hover:text-white transition-colors">Privacy policy</Link>
              <Link href="/legal/community-guidelines" className="text-white/50 hover:text-white transition-colors">Community guidelines</Link>
            </nav>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/35">
            <span>© 2026 Ahavah. All rights reserved.</span>
            <span>Made for the diaspora.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════ Sub-components ══════════════════════════════ */

function SectionHead({
  overline,
  title,
  body,
}: {
  overline: string;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <span className="text-xs font-semibold tracking-widest uppercase text-(--ink-3) block mb-3">
        {overline}
      </span>
      <h2
        className="font-bold text-(--ink) mb-4"
        style={{ fontSize: "clamp(24px, 3.5vw, 38px)" }}
      >
        {title}
      </h2>
      <p className="text-(--ink-2) text-base">{body}</p>
    </div>
  );
}

type IconBadgeTone = "brand" | "cta" | "destructive" | "success" | "elevated" | "muted";

function FeatureCard({
  tone,
  Icon,
  title,
  children,
}: {
  tone: IconBadgeTone;
  Icon: typeof Heart;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card tone="elevated" className="p-5 gap-3 rounded-2xl">
      <IconBadge tone={tone} size="lg" shape="square">
        <Icon size={20} />
      </IconBadge>
      <h3 className="font-semibold text-(--ink)">{title}</h3>
      <p className="text-sm text-(--ink-2) leading-relaxed">{children}</p>
    </Card>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-72 h-130" aria-hidden="true">
      {/* Floating photo cards around phone */}
      <div
        className="absolute -left-8 top-16 w-24 h-28 rounded-2xl overflow-hidden border-[3px] border-white -rotate-6 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
      >
        <img
          src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80&auto=format&fit=crop"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <div
        className="absolute -right-6 top-8 w-20 h-24 rounded-2xl overflow-hidden border-[3px] border-white rotate-[5deg] shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
      >
        <img
          src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <div
        className="absolute -right-4 bottom-24 w-20 h-24 rounded-2xl overflow-hidden border-[3px] border-white -rotate-[4deg] shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
      >
        <img
          src="https://images.unsplash.com/photo-1463453091185-61582044d556?w=180&q=80&auto=format&fit=crop"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Phone shell */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-105 rounded-[40px] border-8 border-[#1a1640] bg-[#0E0040] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
      >
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-5 rounded-full bg-[#1a1640] z-10" />

        <div className="w-full h-full flex flex-col pt-10">
          {/* App header */}
          <div className="flex items-center justify-between px-4 pb-2">
            <Logo variant="horizontal" forceTheme="dark" height={18} />
            <div className="size-7 rounded-full flex items-center justify-center bg-[#1a1640]">
              <Sliders size={12} className="text-lavender" />
            </div>
          </div>

          {/* Profile card */}
          <div className="flex-1 mx-3 rounded-2xl overflow-hidden relative">
            <img
              className="w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop"
              alt=""
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75)_0%,transparent_55%)]" />
            {/* Timeline dots */}
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1">
              <span className="h-0.5 w-8 rounded-full bg-white" />
              <span className="h-0.5 w-3 rounded-full bg-white/40" />
              <span className="h-0.5 w-3 rounded-full bg-white/40" />
            </div>
            {/* Name + city */}
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="font-bold text-sm">Yael, 27</div>
              <div className="flex items-center gap-1 text-[10px] text-white/70 mt-0.5">
                <MapPin size={9} />
                Jerusalem, IL
              </div>
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-center gap-4 py-3">
            <div className="size-10 rounded-full flex items-center justify-center bg-[#2a2060]">
              <XIcon size={14} strokeWidth={2.4} className="text-white" />
            </div>
            <div className="size-12 rounded-full flex items-center justify-center bg-lime">
              <PlayIcon size={18} fill="#000" stroke="none" />
            </div>
            <div className="size-10 rounded-full flex items-center justify-center bg-pink">
              <Heart size={14} fill="#fff" stroke="none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
