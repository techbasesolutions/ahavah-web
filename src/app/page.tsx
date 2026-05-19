"use client";

// Marketing landing uses raw <img> for Unsplash-hosted hero and feature
// photos. next/image would require width/height per image + a remote-
// pattern config for images.unsplash.com just for this page; the
// efficiency gain is marginal on a landing with mostly decorative
// imagery, so the rule is disabled file-wide here.
/* eslint-disable @next/next/no-img-element */

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
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";

import "./landing.css";

/**
 * Ahavah marketing landing — replaces the previous lean welcome at `/`.
 *
 * Faithful port of `9-Landing/Ahavah Landing.html`. Signed-in visitors
 * still redirect to `/discover` (preserved behavior). The waitlist form
 * stashes the typed email in `sessionStorage[PENDING_EMAIL_KEY]` so a
 * visitor who clicks "Sign in" / "Sign up" after entering their email
 * lands on the auth flow with the address pre-filled.
 */
const WAITLIST_STORAGE_KEY = "ahavah.waitlist.email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LandingPage() {
  const router = useRouter();
  const { checking } = useRedirectIfSignedIn();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );
  const formInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const prior = localStorage.getItem(WAITLIST_STORAGE_KEY);
      if (prior) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmail(prior);
      }
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

  // Note: do NOT block rendering on `checking`. Showing a narrow
  // "Signing you in…" column while the auth probe runs collapses the
  // entire landing on desktop into a mobile-sized empty placeholder
  // (LCP-blank for ~200ms even for signed-out visitors). The redirect
  // still happens via useRedirectIfSignedIn's effect; signed-in users
  // see one frame of marketing before navigating to /discover, which
  // is preferable to the blank flash.
  void checking;

  return (
    // Landing follows the app's theme (no data-theme lock). Surface
    // tokens flow from --app / --card / --ink* in globals.css, so light
    // + dark both render correctly. Always-dark surfaces (footer, phone
    // mockup, CTA band gradient) stay dark regardless via hard-coded
    // values in landing.css.
    <div className="landing landing-brand-canvas">
      {/* ============================ NAV ============================ */}
      <header className="landing-nav" role="banner">
        <div className="landing-container landing-nav__inner">
          <Link href="/" className="landing-brand" aria-label="Ahavah home">
            <Logo variant="horizontal" height={36} priority />
          </Link>
          <nav className="landing-nav__links" aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#verified">Verified</a>
            <Link href="/help">FAQ</Link>
          </nav>
          <div className="landing-nav__right">
            <ThemeToggle variant="icon" />
            <Link
              href="/auth/sign-in"
              className="landing-nav__cta"
              prefetch={false}
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ============================ HERO ============================ */}
      <section className="landing-hero" id="waitlist">
        <div className="landing-container landing-hero__grid">
          <div>
            <div className="landing-hero__eyebrow">
              <span className="landing-pill landing-pill--lavender">
                Pre-launch
              </span>
              <span className="landing-overline">
                Spring 2026 · Invite only
              </span>
            </div>
            <h1 className="landing-hero__title">
              Find love
              <br />
              across borders<span className="landing-hero__accent">.</span>
            </h1>
            <p className="landing-hero__sub">
              Verified profiles, 100+ languages, real connections. The dating
              app built for Torah-observant singles who don&apos;t fit anywhere
              else.
            </p>

            <div className="landing-hero__form-wrap">
              <form
                className="landing-hero__form"
                onSubmit={handleSubmit}
                noValidate
              >
                <label htmlFor="waitlist-email" className="sr-only">
                  Email address
                </label>
                <input
                  ref={formInputRef}
                  id="waitlist-email"
                  className="landing-hero__input"
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
                />
                <button
                  type="submit"
                  className="landing-btn landing-btn--cta"
                  disabled={submitting}
                  {...(submitting ? { "aria-busy": "true" as const } : {})}
                >
                  {submitting ? "Saving…" : "Get early access"}
                  {!submitting && <ArrowRight size={18} strokeWidth={2.4} />}
                </button>
              </form>
              <div id="waitlist-helper" className="landing-hero__helper">
                <ShieldCheck size={14} />
                No spam. We email when launch is close. Unsubscribe anytime.
              </div>
              {msg ? (
                <div
                  id="waitlist-msg"
                  className={`landing-hero__msg is-visible${
                    msg.kind === "error" ? " is-error" : ""
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {msg.text}
                </div>
              ) : null}
            </div>

            <div
              className="landing-hero__stats"
              aria-label="Pre-launch interest"
            >
              <div>
                <div className="landing-hero__stat-num">
                  12,400
                  <span style={{ color: "var(--color-lime)" }}>+</span>
                </div>
                <div className="landing-hero__stat-lbl">on the waitlist</div>
              </div>
              <div>
                <div className="landing-hero__stat-num">63</div>
                <div className="landing-hero__stat-lbl">countries</div>
              </div>
              <div>
                <div className="landing-hero__stat-num">
                  100<span style={{ color: "var(--color-lime)" }}>+</span>
                </div>
                <div className="landing-hero__stat-lbl">languages</div>
              </div>
            </div>
          </div>

          {/* Right column — phone mockup + floating photos */}
          <div aria-hidden="true">
            <div className="landing-phone-stack">
              <div className="landing-float-card landing-float-card--1">
                <img
                  src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80&auto=format&fit=crop"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="landing-float-card landing-float-card--2">
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="landing-float-card landing-float-card--3">
                <img
                  src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&q=80&auto=format&fit=crop"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="landing-float-card landing-float-card--4">
                <img
                  src="https://images.unsplash.com/photo-1463453091185-61582044d556?w=180&q=80&auto=format&fit=crop"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="landing-phone">
                <div className="landing-phone__inner">
                  <div className="landing-phone__notch" />
                  <div className="landing-phone__header">
                    <span className="landing-phone__brand-mini">
                      <Logo
                        variant="horizontal"
                        forceTheme="dark"
                        height={22}
                      />
                    </span>
                    <span className="landing-phone__chip">
                      <Sliders
                        size={14}
                        style={{ color: "var(--color-lavender)" }}
                      />
                    </span>
                  </div>
                  <div className="landing-phone__card">
                    <img
                      className="landing-phone__photo"
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop"
                      alt=""
                      loading="eager"
                      decoding="async"
                    />
                    <div className="landing-phone__timeline">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="landing-phone__caption">
                      <div className="landing-phone__name">Yael, 27</div>
                      <div className="landing-phone__loc">
                        <MapPin size={10} />
                        Jerusalem, IL
                      </div>
                    </div>
                  </div>
                  <div className="landing-phone__actions">
                    <div className="landing-phone__circle landing-phone__circle--lavender">
                      <XIcon size={16} strokeWidth={2.4} color="#000" />
                    </div>
                    <div className="landing-phone__circle landing-phone__circle--lime">
                      <PlayIcon size={20} fill="#000" stroke="none" />
                    </div>
                    <div className="landing-phone__circle landing-phone__circle--pink">
                      <Heart size={16} fill="#fff" stroke="none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ FEATURES ============================ */}
      <section className="landing-section landing-section--alt" id="features">
        <div className="landing-container">
          <div className="landing-section__head">
            <span className="landing-overline">What&apos;s different</span>
            <h2>A dating app that respects who you are.</h2>
            <p>
              Built around real-world commitments — Shabbat, kashrut, calendar,
              family. So your first message isn&apos;t a 20-question screener.
            </p>
          </div>

          <div className="landing-features">
            <Feature tone="lavender" Icon={ShieldCheck} title="Verified profiles">
              Every member completes selfie verification before they can match.
              Optional silver + gold tiers add liveness + government-ID checks.
            </Feature>
            <Feature tone="lime" Icon={Globe} title="100+ languages">
              Match across borders. Live translation in chat for the languages
              our community speaks — from Hebrew to Yoruba to Tagalog.
            </Feature>
            <Feature tone="pink" Icon={Heart} title="Faith-aware filters">
              Calendar (lunar/solar), assembly, Torah level, polygyny stance —
              all first-class filters. Find someone whose practice fits yours.
            </Feature>
            <Feature
              tone="success"
              Icon={SparklesIcon}
              title="Real compatibility"
            >
              9-axis compatibility scoring — observance, language, family,
              relocation, lifestyle. Surface people you actually align with.
            </Feature>
            <Feature tone="indigo" Icon={MapPin} title="Diaspora map">
              See your community geographically. Pan to a region, find people
              there — useful for traveling, relocating, or finding home.
            </Feature>
            <Feature tone="gold" Icon={IdCard} title="Privacy by design">
              Hide from map. Require verified matches. Block + report in one
              tap. We never share your government ID with other users.
            </Feature>
          </div>
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section className="landing-section" id="how">
        <div className="landing-container">
          <div className="landing-section__head">
            <span className="landing-overline">How it works</span>
            <h2>Three steps to your first conversation.</h2>
            <p>
              Designed to get you talking with real people fast — without the
              endless onboarding spiral most apps make you suffer through.
            </p>
          </div>

          <div className="landing-how">
            <Step
              n={1}
              mediaTone="1"
              title="Build your profile"
              img="https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800&q=80&auto=format&fit=crop"
            >
              16 quick questions about who you are, what you practice, and what
              you&apos;re looking for. Photos + one selfie verification.
            </Step>
            <Step
              n={2}
              mediaTone="2"
              title="Discover, on your terms"
              img="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80&auto=format&fit=crop"
            >
              Browse curated profiles, filter by faith + lifestyle + location,
              or pan the map to find your diaspora. No swipe-fatigue feed.
            </Step>
            <Step
              n={3}
              mediaTone="3"
              title="Match. Message. Meet."
              img="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80&auto=format&fit=crop"
            >
              Mutual likes unlock chat. Translation built in. Block + report
              in one tap if anything&apos;s off. We&apos;re here to find a
              partner, not a pen-pal.
            </Step>
          </div>
        </div>
      </section>

      {/* ============================ VERIFICATION TIERS ============================ */}
      <section className="landing-section landing-section--alt" id="verified">
        <div className="landing-container">
          <div className="landing-section__head">
            <span className="landing-overline">Trust</span>
            <h2>Three tiers of verification.</h2>
            <p>
              Built around how much trust you want to invest — and how much
              you want to see from the other side.
            </p>
          </div>

          <div className="landing-tiers">
            <article className="landing-tier landing-tier--bronze">
              <div className="landing-tier__chip" aria-hidden="true">
                <IdCard size={26} stroke="#000" />
              </div>
              <h3>Bronze</h3>
              <span className="landing-overline">Profile verified</span>
              <p>
                Selfie + photo cross-check. Confirms you&apos;re a real person
                matching your photos. Required to start matching.
              </p>
            </article>
            <article className="landing-tier landing-tier--silver">
              <div className="landing-tier__chip" aria-hidden="true">
                <Scan size={26} stroke="#000" />
              </div>
              <h3>Silver</h3>
              <span className="landing-overline">Liveness verified</span>
              <p>
                Three quick selfies at different angles. Confirms a real
                person, not a static photo. Surfaces 2.1× more replies on
                average.
              </p>
            </article>
            <article className="landing-tier landing-tier--gold">
              <div className="landing-tier__chip" aria-hidden="true">
                <ShieldCheck size={26} stroke="#000" />
              </div>
              <h3>Gold</h3>
              <span className="landing-overline">ID verified</span>
              <p>
                Government ID + face match via Stripe Identity. Highest trust
                signal. Your document stays with Stripe — we only see the
                result.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ============================ QUOTE ============================ */}
      <section className="landing-section">
        <div className="landing-container">
          <figure className="landing-quote">
            <blockquote className="landing-quote__text">
              &ldquo;Other apps treated my observance like a niche preference.
              Ahavah is the first place I felt seen — before I&apos;d even
              written a bio.&rdquo;
            </blockquote>
            <figcaption className="landing-quote__meta">
              <div className="landing-quote__avatar" aria-hidden="true">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&q=80&auto=format&fit=crop"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div style={{ textAlign: "left" }}>
                <div className="landing-quote__author">
                  Devorah, beta tester
                </div>
                <div className="landing-quote__role">
                  Brooklyn → Jerusalem · matched in week 3
                </div>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ============================ CTA BAND ============================ */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-cta-band">
            {/* Watermark — rotated 145×145 Ahavah mark (lime tile + indigo
                sparkle + lime knockout) anchored bottom-right at 16%
                opacity. Inlined per canonical so the gradient body of the
                band remains the page background and the mark layers above
                it. */}
            <svg
              className="landing-cta-band__mark"
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
            <span
              className="landing-overline"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Limited founding-member spots
            </span>
            <h2>Built across borders. Built for you.</h2>
            <p>
              Join 12,400+ Torah-observant singles waiting for launch.
              Founding members get six months of Premium free.
            </p>
            <button
              type="button"
              className="landing-btn landing-btn--cta"
              onClick={() => {
                router.replace("/#waitlist");
                formInputRef.current?.focus();
              }}
            >
              Reserve my spot
            </button>
          </div>
        </div>
      </section>

      {/* ============================ FOOTER ============================ */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer__grid">
            <div className="landing-footer__brand">
              <span className="landing-brand">
                <Logo variant="horizontal" forceTheme="dark" height={32} />
              </span>
              <p className="landing-footer__tag">
                Find love across borders. Verified profiles, 100+ languages,
                real connections. Made for the diaspora.
              </p>
            </div>

            <div className="landing-footer__col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#verified">Verification</a>
              <a href="#waitlist">Join waitlist</a>
            </div>
            <div className="landing-footer__col">
              <h4>Company</h4>
              <Link href="/help">Help</Link>
              <a href="mailto:admin@ahavah.app">Contact</a>
              <Link href="/legal/community-guidelines">Community</Link>
            </div>
            <div className="landing-footer__col">
              <h4>Legal</h4>
              <Link href="/legal/terms">Terms of service</Link>
              <Link href="/legal/privacy">Privacy policy</Link>
              <Link href="/legal/community-guidelines">
                Community guidelines
              </Link>
            </div>
          </div>

          <div className="landing-footer__legal">
            <span>© 2026 Ahavah. All rights reserved.</span>
            <span>Made for the diaspora.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  tone,
  Icon,
  title,
  children,
}: {
  tone: "lavender" | "lime" | "pink" | "success" | "indigo" | "gold";
  Icon: typeof Heart;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="landing-feature">
      <div className={`landing-feature__icon landing-feature__icon--${tone}`}>
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Step({
  n,
  mediaTone,
  title,
  img,
  children,
}: {
  n: number;
  mediaTone: "1" | "2" | "3";
  title: string;
  img: string;
  children: React.ReactNode;
}) {
  return (
    <div className="landing-step">
      <span className="landing-step__badge">{n}</span>
      <div className={`landing-step__media landing-step__media--${mediaTone}`}>
        <img src={img} alt="" loading="lazy" decoding="async" />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
