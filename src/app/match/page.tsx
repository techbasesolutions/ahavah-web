"use client";

import { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Send, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

// Confetti uses motion/react's useReducedMotion hook which evaluates
// `matchMedia("(prefers-reduced-motion: reduce)")` at render time. The
// server can't read the user's OS pref, so SSR + first-client-render
// disagree on whether to render the pieces — produces a hydration
// mismatch warning. dynamic({ssr:false}) defers the component to
// post-mount, eliminating the divergence at the cost of one frame's
// invisibility (acceptable for a decorative burst that fires at delay
// 0.3s anyway). Same pattern SP14 uses for WorldMap + MapAvatar.
const Confetti = dynamic(
  () => import("@/components/app/confetti").then((m) => m.Confetti),
  { ssr: false },
);
import { PageShell } from "@/components/app/page-shell";
import { PhotoTile } from "@/components/app/photo-tile";
import { sampleByName } from "@/lib/profile-sample";

const PROFILE_GRADIENTS = {
  self:    "linear-gradient(135deg,#FFB088,#FF7A53)",
  matched: "linear-gradient(135deg,#9F76EA,#5524F5)",
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Fallback match subject when no id is provided or profile lookup fails.
// Esther is one of the SAMPLE_PROFILES; her /profile/esther + /chat/esther
// routes both exist and render real content.
const FALLBACK_SUBJECT = {
  id: "esther",
  name: "Esther",
};

// Assert the fallback resolves at module load. If sample-profiles renames
// or removes 'esther', this throws loudly instead of silently 404ing
// the Send/Photo destinations.
if (!sampleByName(FALLBACK_SUBJECT.id)) {
  throw new Error(
    `FALLBACK_SUBJECT.id "${FALLBACK_SUBJECT.id}" not found in SAMPLE_PROFILES`,
  );
}

function MatchPageContent() {
  const params = useSearchParams();
  const rawId = params.get("id")?.toLowerCase().trim() || FALLBACK_SUBJECT.id;
  const profile = sampleByName(rawId);
  const subject = profile?.firstName
    ? { id: rawId, name: profile.firstName }
    : FALLBACK_SUBJECT;

  // Triple-pulse haptic on mount — PWA users on mobile get a real
  // physical "tap-tap-tap" for the match moment. Skipped if API absent
  // or prefers-reduced-motion is set. Silent on errors.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("vibrate" in navigator)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      navigator.vibrate([50, 30, 80]);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <PageShell bottomPad="default" className="px-5 pt-6">
      {/* Gradient mesh backdrop — fixed-positioned radial gradients (lime
          top + pink bottom) paint a soft, brand-color atmospheric wash
          behind the celebration. Decorative; aria-hidden. SP19 T4. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 60% 40% at 50% 15%, rgba(200, 255, 136, 0.06), transparent 70%),
            radial-gradient(ellipse 70% 50% at 50% 90%, rgba(255, 192, 203, 0.04), transparent 75%)
          `,
        }}
      />

      {/* sr-only h1 — visible Badge below is the celebration mark, but SRs
          need a heading to land on so the page has structure. */}
      <h1 className="sr-only">It&apos;s a match</h1>

      {/* Close — Button render={<Link>} per Base UI nativeButton pattern */}
      <Button
        nativeButton={false}
        size="icon-tap"
        variant="ghost"
        aria-label="Close"
        className="self-end"
        render={<Link href="/discover" prefetch={false} />}
      >
        <X className="text-white" />
      </Button>

      {/* Celebration cluster — vertically centered, NOT pushed apart from
          the composer by a giant flex-1 void. Cards spring-stagger in from
          opposite sides; lime halo behind ties it to the brand color story
          (mirrors /onboarding/complete's halo recipe). */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative">
          <span
            aria-hidden
            className="ahavah-halo--pulse pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full bg-lime/20 blur-3xl"
          />
          <div className="relative flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, x: -30, rotate: -12 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 18,
                delay: 0.05,
              }}
            >
              <Card
                tone="flat"
                className="relative size-44 h-56 overflow-hidden rounded-3xl border-[3px] border-white p-0 shadow-2xl"
              >
                <PhotoTile
                  aspect="square"
                  radius="lg"
                  surface="none"
                  bg={PROFILE_GRADIENTS.self}
                  className="size-full"
                />
                {/* Corner-tape detail — lavender bubble at top-right
                    suggests scrapbook/paper aesthetic. SP19 T4. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-2 top-2 z-10 h-2 w-6 rotate-12 rounded-sm bg-lavender/70"
                />
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30, rotate: 12 }}
              animate={{ opacity: 1, x: 0, rotate: 5 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 18,
                delay: 0.15,
              }}
              className="-ml-8 -translate-y-4"
            >
              {/* Matched subject photo is tappable to view their full profile. */}
              <Link
                href={`/profile/${subject.id}`}
                prefetch={false}
                aria-label={`View ${subject.name}'s profile`}
                className="block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-lavender"
              >
                <Card
                  tone="flat"
                  className="relative size-44 h-56 overflow-hidden rounded-3xl border-[3px] border-white p-0 shadow-2xl"
                >
                  <PhotoTile
                    aspect="square"
                    radius="lg"
                    surface="none"
                    bg={PROFILE_GRADIENTS.matched}
                    className="size-full"
                  />
                  {/* Corner-tape detail — pink bubble mirrors the self
                      card's lavender. SP19 T4. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-2 top-2 z-10 h-2 w-6 rotate-12 rounded-sm bg-pink/70"
                  />
                </Card>
              </Link>
            </motion.div>

            {/* Mid-cards Sparkle dot — spring-pops at the seam between
                the two photos. Represents "two souls recognized". Lime
                color + lime drop-shadow glow. SP19 T4. */}
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
              <Sparkles className="size-3 text-lime drop-shadow-[0_0_8px_rgba(200,255,136,0.6)]" />
            </motion.div>
          </div>
        </div>

        {/* Badge appears AFTER cards have settled — the climax beat.
            Wrapped in `relative` so <Confetti> (absolute left-1/2 top-1/2)
            anchors at the badge center. Keyframe-array animation adds a
            heartbeat pulse after the initial pop. Lime drop-shadow glow
            replaces the default shadow-lg. SP19 T4. */}
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
          >
            <Badge
              variant="lime"
              size="lg"
              className="-rotate-3 px-6 py-3 text-display shadow-[0_4px_20px_rgba(200,255,136,0.4)]"
            >
              It&apos;s a match!
            </Badge>
          </motion.div>
        </div>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center text-meta text-white/85"
        >
          You and{" "}
          <Link
            href={`/profile/${subject.id}`}
            prefetch={false}
            className="text-lime underline-offset-2 hover:underline focus-visible:underline"
          >
            {subject.name}
          </Link>{" "}
          liked each other.
        </motion.p>
      </div>

      {/* Footer actions — composer + secondary stay grouped together,
          immediately below the celebration cluster (no flex-1 void). */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="flex flex-col gap-3"
      >
        <InputGroup tone="elevated" className="h-input rounded-2xl px-4">
          <InputGroupInput
            placeholder="Say hi 👋"
            aria-label="Say hi message"
            className="text-body text-white placeholder:text-text-muted"
          />
          <InputGroupAddon align="inline-end" className="pr-0">
            {/* Send navigates to the new chat with the matched subject.
                Real backend-send wires up when chat is server-backed; for
                now this lands the user on /chat/[id] where their typed
                'Say hi' message starts the conversation. */}
            <Button
              nativeButton={false}
              size="circle"
              tone="cta"
              aria-label="Send"
              render={<Link href={`/chat/${subject.id}`} prefetch={false} />}
            >
              <Send className="text-black" />
            </Button>
          </InputGroupAddon>
        </InputGroup>

        <Button
          nativeButton={false}
          variant="outlineSubtle"
          size="cta"
          render={<Link href="/discover" prefetch={false} />}
        >
          Keep swiping
        </Button>
      </motion.div>
    </PageShell>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={null}>
      <MatchPageContent />
    </Suspense>
  );
}
