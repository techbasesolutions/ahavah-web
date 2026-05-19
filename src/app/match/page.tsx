"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

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
    <PageShell bottomPad="none" desktopShell="full-bleed" className="px-5 pt-6">
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

      <Button
        nativeButton={false}
        size="icon-tap"
        variant="ghost"
        aria-label="Close"
        className="self-end text-(--ink)"
        render={<Link href="/discover" prefetch={false} />}
      >
        <X />
      </Button>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {/* Photo pair + centered sparkle. Canonical (screens/06-match.md):
            280×340 cards, 4px white border, rotate -4° / +6°, -50px
            overlap + 24px y-offset on the second card, 56px lime
            Sparkle centered between them at the overlap. No "tape strip"
            decoration (that was an earlier hand-rolled invention). */}
        <div className="relative flex items-center justify-center">
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
              className="relative w-70 h-85 overflow-hidden rounded-[32px] border-4 border-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
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
            className="relative z-10 -ml-12 translate-y-6"
          >
            <Link
              href={profileHref}
              prefetch={false}
              aria-label={`View ${subject.name}'s profile`}
              className="block rounded-[32px] outline-none focus-visible:ring-2 focus-visible:ring-(--color-lavender)"
            >
              <Card
                tone="flat"
                className="relative w-70 h-85 overflow-hidden rounded-[32px] border-4 border-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
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
              </Card>
            </Link>
          </motion.div>

          {/* Centered 56px lime Sparkle per canonical — sits ON TOP of
              the photo overlap. z-20 puts it above both cards. */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 14,
              delay: 0.25,
            }}
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <Sparkles className="size-14 text-(--color-lime) drop-shadow-[0_0_24px_rgba(215,255,129,0.7)]" />
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
            className="-rotate-3 rounded-[22px] px-9.5 py-4.5 bg-(--color-lime) text-black text-5xl font-extrabold tracking-tight leading-none shadow-[0_12px_40px_rgba(215,255,129,0.45)]"
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
        className="flex flex-col items-center gap-3 w-full mx-auto md:max-w-160"
      >
        <div className="flex flex-col md:flex-row gap-3 w-full md:max-w-120">
          <InputGroup
            tone="default"
            className="flex-1 h-14 rounded-2xl px-4 bg-(--card) border border-(--hairline)"
          >
            <InputGroupInput
              placeholder={`Say hi to ${subject.name}…`}
              aria-label="Say hi message"
              className="text-body text-(--ink) placeholder:text-(--ink-3)"
              value={hello}
              onChange={(e) => setHello(e.target.value)}
              maxLength={500}
            />
            <InputGroupAddon align="inline-end" className="pr-0">
              <Button
                nativeButton={false}
                size="circle-lg"
                tone="cta"
                aria-label={
                  helloTrimmed.length > 0 ? "Send message" : "Open chat"
                }
                render={<Link href={messageHref} prefetch={false} />}
              >
                <Send className="text-black" />
              </Button>
            </InputGroupAddon>
          </InputGroup>

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
