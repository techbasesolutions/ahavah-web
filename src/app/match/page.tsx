"use client";

// /match is the celebration surface. Pixel-precise sizing (clamp() for
// adaptive cards, color-mix() for the lime halo) is taken from the
// canonical mobile mockup at Landing Page/Ahavah-mobile/.../screens.jsx
// L420-504. Same eslint-disable rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Confetti uses motion/react's useReducedMotion which is post-mount only.
const Confetti = dynamic(
  () => import("@/components/app/confetti").then((m) => m.Confetti),
  { ssr: false },
);
import { PageShell } from "@/components/app/page-shell";
import { PhotoTile } from "@/components/app/photo-tile";
import { apiClient, ApiError } from "@/lib/api-client";
import type { MatchRecord } from "@/lib/api-types";
import { useProfile } from "@/lib/use-profile";
import { photoOrGradient, photosFromUuids, type PhotoSource } from "@/lib/photo-or-gradient";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Generic fallback subject when the matchId either isn't supplied or the
// server lookup fails. Display copy is intentionally vague ("Your match")
// because we can't name them. The Message CTA still routes somewhere
// reasonable — /matches — so the user has a path forward.
const FALLBACK_SUBJECT = {
  id: "",
  name: "Your match",
};

/**
 * /match — the post-match celebration screen.
 *
 * Phase W rewire:
 *   - `useSearchParams().get("matchId")` carries the real match id pushed
 *     by /discover after a server-confirmed mutual like.
 *   - `GET /matches/<matchId>` is the canonical lookup. Backend may not
 *     have shipped this endpoint yet (Phase W F.1 backlog); on any error
 *     we silently fall back to a generic celebration so the user is never
 *     stuck staring at a broken page after a real match was created.
 *   - SP19 motion budget is preserved: the badge climax keeps its 1.0s
 *     duration + cascading card delays (0.05s / 0.15s / 0.25s). Per the
 *     plan's motion-budget rubric, /match has an explicit carve-out from
 *     the standard entrance budget — it's the only celebratory screen.
 */
function MatchPageContent() {
  const params = useSearchParams();
  const matchId = params.get("matchId");
  // Backward-compat: older /discover code routed via ?id=<sample-id>.
  // We accept either as a fallback for in-flight users on cached bundles.
  const legacyId = params.get("id");
  const lookupId = matchId ?? legacyId;

  const { profile: viewerProfile } = useProfile();
  const [record, setRecord] = useState<MatchRecord | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    if (!lookupId) {
      // No id supplied — render the generic celebration directly. The
      // setState-in-effect rule warns generically here; this branch fires
      // the haptic + commits the celebration immediately.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFetchAttempted(true);
      return;
    }
    let cancelled = false;
    apiClient
      .get<MatchRecord>(`/matches/${encodeURIComponent(lookupId)}`)
      .then((r) => {
        if (!cancelled) setRecord(r);
      })
      .catch((e: unknown) => {
        // Network / 404 / 405 / etc. — log to the console (Sentry once
        // wired) but fall through to the generic celebration. Users who
        // matched real-time must NEVER see an error here.
        if (e instanceof ApiError) {
          console.warn(`/matches/${lookupId} failed:`, e.status, e.message);
        }
      })
      .finally(() => {
        if (!cancelled) setFetchAttempted(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lookupId]);

  // Resolve the display subject from the fetched record, or fall through.
  // The legacy ?id route preserves the (gradient-only) subject name; the
  // new ?matchId route resolves once the network call returns.
  const subject = record
    ? {
        id: record.with_profile.id,
        name: record.with_profile.firstName ?? FALLBACK_SUBJECT.name,
      }
    : legacyId
      ? { id: legacyId, name: capitalize(legacyId) }
      : FALLBACK_SUBJECT;

  // Self card: viewer's own first photo. Matched card: subject's first
  // photo if the record arrived, otherwise a deterministic gradient.
  const selfPhotoSource: PhotoSource = photoOrGradient(
    {
      firstName: viewerProfile?.firstName ?? "you",
      photos: viewerProfile?.photos,
    },
    0,
  );
  // Match-record peer photos are shipped as photo_uuids; map to
  // PhotoRecord[] so photoOrGradient finds the cdn_url.
  const matchedPeerPhotos =
    record?.with_profile?.photos && record.with_profile.photos.length > 0
      ? record.with_profile.photos
      : photosFromUuids(
          (record?.with_profile as { photo_uuids?: unknown } | undefined)
            ?.photo_uuids,
        );
  const matchedPhotoSource: PhotoSource = photoOrGradient(
    record?.with_profile
      ? { firstName: record.with_profile.firstName, photos: matchedPeerPhotos }
      : { firstName: subject.name },
    0,
  );

  // Triple-pulse haptic on mount — only fires once the celebration is
  // committed (after the fetch attempt has settled, or no id was supplied).
  useEffect(() => {
    if (!fetchAttempted) return;
    if (typeof window === "undefined") return;
    if (!("vibrate" in navigator)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      navigator.vibrate([50, 30, 80]);
    } catch {
      /* ignore */
    }
  }, [fetchAttempted]);

  // Phase W cutover (2026-05-15) — "Say hi" input is now controlled
  // and carried via ?prefill=<msg> into /chat/<id>. Chat page reads
  // it on mount, pre-fills the draft (one-shot), and clears it from
  // the URL. Lets the user edit/send rather than retyping — and
  // doesn't silently discard their first-message intent like before.
  const [hello, setHello] = useState("");

  // Where Message routes — known subject id if we have it, else /matches
  // so the user lands on their list rather than a 404. If they typed
  // a hello, append it as a URL-encoded query param for the chat page
  // to pick up on mount.
  const helloTrimmed = hello.trim();
  const helloParam =
    subject.id && helloTrimmed.length > 0
      ? `?prefill=${encodeURIComponent(helloTrimmed)}`
      : "";
  const messageHref = subject.id ? `/chat/${subject.id}${helloParam}` : "/matches";
  const profileHref = subject.id ? `/profile/${subject.id}` : "/matches";

  return (
    <PageShell bottomPad="none" desktopShell="full-bleed" className="relative px-5 pt-6">
      {/* Canonical backdrop per screens/06-match.md §Halo: var(--app)
          base + lime/18% top halo + pink/12% bottom halo. The previous
          impl hardcoded an indigo→lavender brand gradient OVERLAY,
          which fought the theme (rendered indigo even in light mode).
          Now the active theme's --app shows through cleanly: indigo on
          dark, cream on light, with halos on top in both cases. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 50% 40% at 50% 30%,
              color-mix(in oklch, var(--color-lime) 18%, transparent), transparent 70%),
            radial-gradient(ellipse 60% 50% at 50% 90%,
              color-mix(in oklch, var(--color-pink) 12%, transparent), transparent 75%),
            var(--app)
          `,
        }}
      />

      <h1 className="sr-only">It&apos;s a match</h1>

      {/* Close X — absolute top-right corner so it never collides with
          the photo-pair z-stack and renders reliably across mobile +
          desktop. self-end previously placed it as the first flex child,
          which worked structurally but had no z-index against the
          page-level halo and could be obscured by dev-mode overlays. */}
      <Button
        nativeButton={false}
        size="icon-tap"
        variant="ghost"
        aria-label="Close"
        className="absolute top-3 right-3 z-30 text-(--ink)"
        render={<Link href="/discover" prefetch={false} />}
      >
        <X />
      </Button>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {/* Photo pair. Canonical sizes:
            Mobile  (per screens.jsx:436-473 mobile mockup):
              170×218 cards, 3px white border, rounded-24, rotate -3°/+5°,
              -32px ml + 16 mt overlap. Lime glow halo behind the pair
              (inset:-30, blur 20px lime/30%). Small ribbon accent at
              top-right of each card (lavender on self, pink on match).
            Desktop (per screens/06-match.md desktop spec):
              280×340 cards, 4px white border, rounded-32, rotate -4°/+6°,
              -48px ml + 24 mt overlap. No ribbon, no per-pair halo (the
              page-level radial gradient is enough).
            No sparkle icon — that was the deprecated old brand mark. The
            pill below carries the celebration. */}
        <div className="relative flex items-center justify-center">
          {/* Mobile-only lime glow halo behind the photo pair */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 z-0 lg:hidden"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--color-lime) 30%, transparent), transparent 70%)",
              filter: "blur(20px)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, x: -30, rotate: -12 }}
            animate={{ opacity: 1, x: 0, rotate: -4 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 18,
              delay: 0.05,
            }}
            className="relative z-10"
          >
            <Card
              tone="flat"
              className="relative w-[clamp(140px,42vw,170px)] h-[clamp(180px,54vw,218px)] lg:w-70 lg:h-85 overflow-hidden rounded-[24px] lg:rounded-[32px] border-[3px] lg:border-4 border-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            >
              <PhotoTile
                aspect="square"
                radius="lg"
                surface="none"
                bg={
                  selfPhotoSource.kind === "gradient"
                    ? selfPhotoSource.css
                    : undefined
                }
                className="size-full"
              >
                {selfPhotoSource.kind === "photo" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selfPhotoSource.src}
                    alt={`${viewerProfile?.firstName ?? "Your"} photo`}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </PhotoTile>
              {/* Mobile-only ribbon accent (lavender on the self card) */}
              <span
                aria-hidden
                className="absolute top-2 right-2 w-6 h-1.5 rounded-sm rotate-12 bg-[color-mix(in_oklch,var(--color-lavender)_70%,transparent)] lg:hidden"
              />
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30, rotate: 12 }}
            animate={{ opacity: 1, x: 0, rotate: 6 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 18,
              delay: 0.15,
            }}
            className="relative z-10 -ml-8 translate-y-4 lg:-ml-12 lg:translate-y-6"
          >
            <Link
              href={profileHref}
              prefetch={false}
              aria-label={`View ${subject.name}'s profile`}
              className="block rounded-[24px] lg:rounded-[32px] outline-none focus-visible:ring-2 focus-visible:ring-(--color-lavender)"
            >
              <Card
                tone="flat"
                className="relative w-[clamp(140px,42vw,170px)] h-[clamp(180px,54vw,218px)] lg:w-70 lg:h-85 overflow-hidden rounded-[24px] lg:rounded-[32px] border-[3px] lg:border-4 border-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              >
                <PhotoTile
                  aspect="square"
                  radius="lg"
                  surface="none"
                  bg={
                    matchedPhotoSource.kind === "gradient"
                      ? matchedPhotoSource.css
                      : undefined
                  }
                  className="size-full"
                >
                  {matchedPhotoSource.kind === "photo" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={matchedPhotoSource.src}
                      alt={`${subject.name}'s photo`}
                      className="absolute inset-0 size-full object-cover"
                    />
                  )}
                </PhotoTile>
                {/* Mobile-only ribbon accent (pink on the match card) */}
                <span
                  aria-hidden
                  className="absolute top-2 right-2 w-6 h-1.5 rounded-sm rotate-12 bg-[color-mix(in_oklch,var(--color-pink)_70%,transparent)] lg:hidden"
                />
              </Card>
            </Link>
          </motion.div>

        </div>

        {/* Headline pill — canonical: 48px / 800w / -0.02em / lime bg /
            22px radius / -3° rotate / lime-glow shadow. Explicit values
            per spec, NOT the Badge primitive's preset sizing. */}
        <div className="relative">
          <Confetti className="-translate-x-1/2 -translate-y-1/2" />
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: [0.4, 1, 1.05, 1] }}
            transition={{
              duration: 1.0,
              delay: 0.3,
              times: [0, 0.5, 0.75, 1],
              ease: "easeOut",
            }}
            className="whitespace-nowrap -rotate-3 rounded-[18px] lg:rounded-[22px] px-6 lg:px-9.5 py-3 lg:py-4.5 bg-(--color-lime) text-black text-2xl lg:text-5xl font-extrabold tracking-tight leading-none shadow-[0_4px_20px_rgba(215,255,129,0.4)] lg:shadow-[0_12px_40px_rgba(215,255,129,0.45)]"
          >
            It&apos;s a match!
          </motion.div>
        </div>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center text-body text-(--ink-2)"
        >
          You and{" "}
          {subject.id ? (
            <Link
              href={profileHref}
              prefetch={false}
              className="text-(--color-lavender) font-semibold underline-offset-2 hover:underline focus-visible:underline"
            >
              {subject.name}
            </Link>
          ) : (
            <span className="text-(--color-lavender) font-semibold">
              {subject.name}
            </span>
          )}{" "}
          liked each other.
        </motion.p>
      </div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.7 }}
        // Canonical composer row (per screens/06-match.md §Composer):
        // horizontal flex at md+, max-w-120, Say-hi input on the
        // left with the inline send button + adjacent View-profile
        // ghost button on the right. On mobile we stack (column) since
        // 480px would overflow the 414px column. "Keep swiping" stays
        // as a retained-functional link below (NOT in canonical but a
        // useful escape hatch — flagged as deliberate retention).
        className="mt-auto flex flex-col items-center gap-3 w-full mx-auto md:max-w-160"
      >
        <div className="flex flex-col md:flex-row gap-3 w-full md:max-w-120">
          {/* Composer: kit <Input> primitive renders the visible chrome
              (border, bg, radius), and a kit <Button> is absolutely
              positioned over its right edge for the inline send action.
              Previously used <InputGroup> + <InputGroupInput>, but the
              InputGroup primitive's child clearing relies on tailwind-
              merge to strip the Input's [border-width:1.5px] arbitrary-
              property which it can't reliably do — result was a visible
              inner rectangle inside the pill (only InputGroup consumer
              in the project, untested infrastructure). Direct Input +
              absolute Button uses two well-tested primitives instead. */}
          <div className="relative flex-1">
            <Input
              size="lg"
              tone="default"
              placeholder={`Say hi to ${subject.name}…`}
              aria-label="Say hi message"
              className="h-14 rounded-2xl pr-16 text-body"
              value={hello}
              onChange={(e) => setHello(e.target.value)}
              maxLength={500}
            />
            <Button
              nativeButton={false}
              size="circle-lg"
              tone="cta"
              aria-label={
                helloTrimmed.length > 0 ? "Send message" : "Open chat"
              }
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
              render={<Link href={messageHref} prefetch={false} />}
            >
              <Send className="text-black" />
            </Button>
          </div>

          {subject.id ? (
            <Button
              nativeButton={false}
              variant="outline"
              size="tap"
              className="h-14 px-5.5 rounded-[16px] border-(--border) text-(--ink) bg-transparent hover:bg-(--card) whitespace-nowrap"
              render={
                <Link
                  href={`/profile/${encodeURIComponent(subject.id)}?from=match`}
                  prefetch={false}
                />
              }
            >
              View {subject.name}&apos;s profile
            </Button>
          ) : null}
        </div>

        {/* "Back to Discover" — mobile-only secondary action. Replaces the
            canonical "Keep swiping" text since /discover is a static
            card surface (the swipe-deck idea was killed by user
            2026-05-19); the language no longer fits. Routes to the same
            destination the X close button does. Hidden on desktop where
            the X is the only escape needed. */}
        <Button
          nativeButton={false}
          variant="link"
          size="tap"
          className="md:hidden self-center text-meta text-(--ink-3) hover:text-(--ink) underline-offset-2 hover:underline"
          render={<Link href="/discover" prefetch={false} />}
        >
          Back to Discover
        </Button>
      </motion.div>
    </PageShell>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MatchPage() {
  return (
    <Suspense fallback={null}>
      <MatchPageContent />
    </Suspense>
  );
}
