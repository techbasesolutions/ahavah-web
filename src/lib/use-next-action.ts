"use client";

/**
 * useNextAction — data layer for the /discover "next action" card.
 *
 * Wires the pure ranking in next-action.ts to the REAL signals already
 * available in this app: the profile hook, /matches, /check-verification,
 * and the local chat-message cache. Where a signal genuinely doesn't
 * exist yet, the gap is called out below rather than fabricated.
 *
 * Signal inventory (SOT rank -> source):
 *   1. message-failed        REAL, but LOCAL-CACHE ONLY. There is no
 *      server endpoint that says "does this user have any unsent
 *      messages" — chat-cache.ts's IndexedDB store (this device only)
 *      is scanned for a message with status "failed" sent by this user.
 *      A failure that happened on another device, or predates this
 *      browser's cache, will not surface. See chat-cache.ts's doc on
 *      `getMostRecentFailedOutgoing`.
 *   2. new-match              REAL via GET /matches, but "unseen" is
 *      APPROXIMATED: MatchRecord has no seen/unseen flag server-side, so
 *      "recent" is a client-side recency window (RECENT_MATCH_MS) on
 *      `created_at` rather than a true read receipt.
 *   3. profile-incomplete /   REAL — profile.photos / profile.bio
 *      profile-finish          directly, plus the same MINIMUM_COMPLETE_FIELDS
 *      gate /discover's own eligibility check uses (missingRequiredFields,
 *      isDiscoverEligible). Two distinct cards share this signal:
 *      "profile-incomplete" (BLOCKING, "you are hidden") fires ONLY when
 *      `!isDiscoverEligible(profile)` — genuinely not visible in the deck.
 *      "profile-finish" (soft, evergreen, rank 5) fires when the member
 *      IS eligible (already appears) but `stepsLeft > 0` (missing photo/
 *      about/an optional field) — it never claims the member is hidden.
 *      Fixed 2026-09-08 after a prod report: this used to fire the
 *      blocking copy for ANY `stepsLeft > 0`, which is false for an
 *      eligible member. The "About N minutes" estimate is a UX heuristic
 *      (2 min/step), not measured. The primary CTA label is derived from
 *      which field is actually missing (finishProfilePrimaryLabel) rather
 *      than hardcoded "Add a photo". Fixed AGAIN same day after auditing
 *      all 24 prod members (not just the one report): the BLOCKING card's
 *      title/body/CTA-href also unconditionally assumed photo/about were
 *      the cause — 7 real members were non-eligible ONLY because
 *      `wantsChildren` was unanswered (photo + about already present).
 *      blockingProfileCopy() + blockingProfilePrimaryHref() now name the
 *      ACTUAL missing item (photo/about specifics only when true; a
 *      required-field-named or generic sentence otherwise) and route the
 *      CTA to `firstMissingStepFor(profile)`'s real onboarding step.
 *   4. verification-pending   REAL via GET /check-verification (the same
 *      endpoint useBronzeVerification/useSilverVerification poll during
 *      an active submission) — read once here so a reload doesn't lose
 *      "still under review" the way the upload-flow hooks do (they reset
 *      to idle on every mount).
 *   5. add-city               REAL — profile.citySet, the same signal
 *      CityNudgeBanner reads (spread in from ahavah_extra by useProfile).
 *   6. profile-nudge          REAL — profile.promptCards empty/undefined.
 *      Copy is fixed ("Add two more answers") because there's no
 *      real "how many answers should you have" denominator to compute a
 *      precise remaining count from — using a dynamic number here would
 *      be inventing a signal that doesn't exist. See the report for detail.
 *   7. premium-upsell         REAL — isPremium(profile).
 *   8. steady-deck            REAL — the caller's own deck item count
 *      (reused from useDiscoverDeck, not re-fetched here). The second
 *      SOT sentence ("N are in countries you said you would move to")
 *      is omitted per the task's explicit fallback rule: `relocation` is
 *      a single enum ("will-relocate" etc.), not a country list, so
 *      there is no real M to source.
 */

import { useEffect, useMemo, useState } from "react";

import { apiClient } from "@/lib/api-client";
import type { Profile } from "@/lib/profile-schema";
import { isPremium } from "@/lib/profile-schema";
import {
  computeCompleteness,
  firstMissingStepFor,
  isDiscoverEligible,
  missingRequiredFields,
} from "@/lib/profile-completeness";
import type { MatchesResponse, MatchRecord } from "@/lib/api-types";
import { photoOrGradient, photosFromUuids } from "@/lib/photo-or-gradient";
import { readChatSession } from "@/lib/chat-session";
import { getMostRecentFailedOutgoing } from "@/lib/chat-cache";
import { visitTimeLabel } from "@/lib/use-visitors";
import type { ChatMessage } from "@/lib/chat-types";
import {
  blockingProfileCopy,
  blockingProfilePrimaryHref,
  computeVisibilitySteps,
  finishProfilePrimaryLabel,
  pickProfileCompletionCard,
  selectNextAction,
  writtenAtLabel,
  type NextActionKind,
} from "@/lib/next-action";

/** A mutual match counts as "recent" for the new-match card for this long
 *  after it formed. Approximates the missing server-side seen/unseen
 *  flag — see module doc above. */
const RECENT_MATCH_MS = 72 * 60 * 60 * 1000; // 72h

/** Postgres-style "2026-07-19 09:43:55+00" -> ISO, so `new Date()` parses
 *  it. Mirrors the normalization /matches' own page does for liked_at. */
function toIso(pgTimestamp: string): string {
  return pgTimestamp.replace(" ", "T").replace(/\+00$/, "Z");
}

function place(p: { city?: string; country?: string } | undefined | null): string {
  return p?.city || p?.country || "";
}

export type NextActionAvatar = { src?: string; gradientCss?: string; initial: string };

export type NextActionRowData = {
  kind: NextActionKind;
  title: string;
  subtitle: string;
  href: string;
};

export type NextActionPrimaryData = {
  kind: NextActionKind;
  tone: "urgent" | "warn" | "calm";
  kicker: string;
  title: string;
  body?: string;
  primaryLabel: string;
  primaryHref?: string;
  onPrimary?: () => void;
  secondaryLabel: string;
  secondaryHref?: string;
  onSecondary?: () => void;
  avatars?: ReadonlyArray<NextActionAvatar>;
  useIconTile?: boolean; // verification-pending: single icon tile, not a facepair
  progress?: { percent: number; doneLabel: string; etaLabel: string };
};

export type UseNextActionResult = {
  primary: NextActionPrimaryData | null;
  more: NextActionRowData[];
  loading: boolean;
};

type LiveEntry = { kind: NextActionKind; primary: NextActionPrimaryData; row: NextActionRowData };

export function useNextAction(input: {
  profile: Partial<Profile>;
  profileLoaded: boolean;
  deckCount: number;
  onOpenDeck: () => void;
  onAdjustFilters: () => void;
}): UseNextActionResult {
  const { profile, profileLoaded, deckCount, onOpenDeck, onAdjustFilters } = input;

  // ---- async signals not already available from the caller ----------

  const [matches, setMatches] = useState<ReadonlyArray<MatchRecord> | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [failedMessage, setFailedMessage] = useState<ChatMessage | null>(null);
  const [signalsLoaded, setSignalsLoaded] = useState(false);
  // `Date.now()` is impure for React's purity rule, so the "is this match
  // recent" window is computed against a `now` snapshot taken once here
  // (same pattern as quota-exceeded-card.tsx), not called inline in the
  // render-time useMemo below.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const session = readChatSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());

    async function run() {
      const [matchesRes, verifyRes, failedRes] = await Promise.allSettled([
        apiClient.get<MatchesResponse>("/matches"),
        apiClient.get<{ status?: string | null }>("/check-verification"),
        session ? getMostRecentFailedOutgoing(session.myUuid) : Promise.resolve(null),
      ]);
      if (!alive) return;
      if (matchesRes.status === "fulfilled") {
        setMatches(matchesRes.value.matches ?? []);
      } else {
        setMatches([]);
      }
      if (verifyRes.status === "fulfilled") {
        const status = verifyRes.value.status ?? "";
        // "success" = approved, "failure" = rejected — neither is "pending".
        // Anything else non-empty (queued / uploading-photo / in-progress)
        // means a submission is actively being reviewed. A 404/empty
        // response (no job ever submitted) lands here as "" and is
        // correctly treated as not-pending.
        setVerificationPending(status !== "" && status !== "success" && status !== "failure");
      } else {
        setVerificationPending(false);
      }
      if (failedRes.status === "fulfilled") {
        setFailedMessage(failedRes.value);
      } else {
        setFailedMessage(null);
      }
      setSignalsLoaded(true);
    }
    void run();
    return () => {
      alive = false;
    };
    // Run once — this is a point-in-time read for the home nudge, not a
    // live subscription (matches useBronzeVerification's own polling
    // model, which owns live updates during an active submission).
  }, []);

  return useMemo(() => {
    if (!profileLoaded || !signalsLoaded || now == null) {
      return { primary: null, more: [], loading: true };
    }

    const live: LiveEntry[] = [];

    // 1. message-failed --------------------------------------------------
    if (failedMessage) {
      const peer = (matches ?? []).find(
        (m) => m.with_profile.id === failedMessage.threadId,
      )?.with_profile;
      const name = peer?.firstName ?? null;
      const title = name ? `Your message to ${name} did not send` : "Your message did not send";
      const chatHref = `/chat/${encodeURIComponent(failedMessage.threadId)}?message=${encodeURIComponent(failedMessage.id)}`;
      const photoSource = peer
        ? photoOrGradient(
            {
              firstName: peer.firstName,
              photos:
                peer.photos && peer.photos.length > 0
                  ? peer.photos
                  : photosFromUuids((peer as { photo_uuids?: unknown }).photo_uuids),
            },
            0,
          )
        : null;
      live.push({
        kind: "message-failed",
        primary: {
          kind: "message-failed",
          tone: "warn",
          kicker: "Not sent",
          title,
          body: `Written ${writtenAtLabel(toIso(failedMessage.serverTime))}. Review the saved message and its delivery status.`,
          primaryLabel: "Review message",
          primaryHref: chatHref,
          secondaryLabel: "Open the chat",
          secondaryHref: chatHref,
          avatars: photoSource
            ? [
                {
                  src: photoSource.kind === "photo" ? photoSource.src : undefined,
                  gradientCss: photoSource.kind === "gradient" ? photoSource.css : undefined,
                  initial: (name ?? "?")[0]?.toUpperCase() ?? "?",
                },
              ]
            : undefined,
        },
        row: {
          kind: "message-failed",
          title,
          subtitle: `Written ${writtenAtLabel(toIso(failedMessage.serverTime))}`,
          href: chatHref,
        },
      });
    }

    // 2. new-match ---------------------------------------------------------
    const recentMatch = (matches ?? [])
      .filter((m) => now - new Date(toIso(m.created_at)).getTime() <= RECENT_MATCH_MS)
      .sort(
        (a, b) => new Date(toIso(b.created_at)).getTime() - new Date(toIso(a.created_at)).getTime(),
      )[0];
    if (recentMatch) {
      const peer = recentMatch.with_profile;
      const name = peer.firstName ?? "Someone";
      const agoLabel = visitTimeLabel(toIso(recentMatch.created_at)).toLowerCase();
      const herPlace = place(peer);
      const yourPlace = place(profile);
      const body =
        herPlace && yourPlace
          ? `You matched ${agoLabel}. ${name} is in ${herPlace}, you are in ${yourPlace}.`
          : `You matched ${agoLabel}.`;
      const profileHref = `/profile/${encodeURIComponent(peer.id)}?from=discover`;
      const chatHref = `/chat/${encodeURIComponent(peer.id)}`;
      const photoSource = photoOrGradient(
        {
          firstName: peer.firstName,
          photos:
            peer.photos && peer.photos.length > 0
              ? peer.photos
              : photosFromUuids((peer as { photo_uuids?: unknown }).photo_uuids),
        },
        0,
      );
      const ownPhotoUrl = profile.photos?.[0]?.cdn_url;
      live.push({
        kind: "new-match",
        primary: {
          kind: "new-match",
          tone: "urgent",
          kicker: "New match",
          title: `${name} liked you back`,
          body,
          primaryLabel: "Send a message",
          primaryHref: chatHref,
          secondaryLabel: "View profile",
          secondaryHref: profileHref,
          avatars: [
            {
              src: photoSource.kind === "photo" ? photoSource.src : undefined,
              gradientCss: photoSource.kind === "gradient" ? photoSource.css : undefined,
              initial: name[0]?.toUpperCase() ?? "?",
            },
            {
              src: ownPhotoUrl,
              initial: (profile.firstName ?? "•")[0]?.toUpperCase() ?? "•",
            },
          ],
        },
        row: {
          kind: "new-match",
          title: `${name} liked you back`,
          subtitle: `Matched ${agoLabel}`,
          href: profileHref,
        },
      });
    }

    // 3. profile-incomplete (BLOCKING) vs profile-finish (soft evergreen)
    //    -----------------------------------------------------------------
    // Bug fix (2026-09-08, prod report): a Gold-verified member who
    // already appears in the deck (isDiscoverEligible === true) was shown
    // the BLOCKING "you are hidden ... before you appear in the deck"
    // card + a "Welcome" greeting, just because one optional field
    // (`stepsLeft`, which also counts photo/about) was non-zero. That is
    // false for an eligible member — they are NOT hidden.
    //
    // /discover's own soft-completeness gate (the `useEffect` above this
    // hook, in discover/page.tsx) already redirects a genuinely-ineligible,
    // not-yet-onboarded member AWAY to their missing step — but it
    // early-returns once `readOnboarded()` is true, so an already-onboarded
    // member who is merely missing an optional field (or even a
    // MINIMUM_COMPLETE_FIELDS field entered post-onboarding, e.g. via a
    // reverted /profile/edit change) can legitimately reach /discover
    // while eligible. That's the common case this hook must not
    // mislabel as "hidden".
    //
    // isDiscoverEligible() (same MINIMUM_COMPLETE_FIELDS gate the page
    // itself uses) is the authoritative "is this member actually hidden"
    // check — NOT merely "stepsLeft > 0", which also counts photo/about
    // (not part of that gate) and can be > 0 for an already-visible member.
    const hasPhoto = Boolean(profile.photos && profile.photos.length > 0);
    const hasBio = Boolean(profile.bio && profile.bio.length > 0);
    const missingRequired = missingRequiredFields(profile as Profile);
    const eligible = isDiscoverEligible(profile as Profile);
    const visibility = computeVisibilitySteps({
      hasPhoto,
      hasBio,
      missingRequiredCount: missingRequired.length,
      requiredTotal: computeCompleteness(profile as Profile).requiredTotal,
    });
    const completionCard = pickProfileCompletionCard({
      eligible,
      stepsLeft: visibility.stepsLeft,
    });
    if (completionCard) {
      const editHref = "/profile/edit";
      const primaryLabel = finishProfilePrimaryLabel({ hasPhoto, hasBio });
      const progress = {
        percent: Math.round((visibility.doneCount / visibility.stepsTotal) * 100),
        doneLabel: `${visibility.doneCount} of ${visibility.stepsTotal} done`,
        etaLabel: `About ${visibility.estimatedMinutes} ${visibility.estimatedMinutes === 1 ? "minute" : "minutes"}`,
      };
      if (completionCard === "profile-incomplete") {
        // Genuinely hidden — the blocking, urgent card. Rare on
        // /discover (the page's own redirect covers most of this) but
        // kept correct for whatever slips through (e.g. a required field
        // cleared post-onboarding).
        //
        // Bug fix (2026-09-08, prod audit of all 24 members): this used
        // to hardcode the photo/about title+body+CTA unconditionally —
        // 7 real members were non-eligible ONLY because `wantsChildren`
        // was unanswered (they already had a photo and about), so they
        // were told "Add a photo" and shown false photo/about copy. The
        // title/body now only claim photo/about when one is genuinely
        // missing (blockingProfileCopy); the CTA routes to the actual
        // missing MINIMUM_COMPLETE_FIELDS step (firstMissingStepFor) once
        // photo and about both exist (blockingProfilePrimaryHref).
        const { title, body } = blockingProfileCopy({
          hasPhoto,
          hasBio,
          missingRequiredKeys: missingRequired,
        });
        const primaryHref = blockingProfilePrimaryHref({
          hasPhoto,
          hasBio,
          firstMissingStepHref: firstMissingStepFor(profile as Profile) ?? null,
        });
        live.push({
          kind: "profile-incomplete",
          primary: {
            kind: "profile-incomplete",
            tone: "urgent",
            kicker: "Finish your profile",
            title,
            body,
            primaryLabel,
            primaryHref,
            secondaryLabel: "See all steps",
            secondaryHref: editHref,
            progress,
          },
          row: {
            kind: "profile-incomplete",
            title: "Finish your profile",
            subtitle: `${visibility.stepsLeft} ${visibility.stepsLeft === 1 ? "step" : "steps"} left`,
            href: primaryHref,
          },
        });
      } else {
        // Eligible — already appears in the deck, just not 100% done.
        // Soft, evergreen, honest: never claims the profile is hidden.
        live.push({
          kind: "profile-finish",
          primary: {
            kind: "profile-finish",
            tone: "calm",
            kicker: "Finish your profile",
            title:
              visibility.stepsLeft === 1
                ? "One more step to finish your profile"
                : `${visibility.stepsLeft} steps left to finish your profile`,
            body: "A more complete profile gets seen by more people.",
            primaryLabel,
            primaryHref: editHref,
            secondaryLabel: "See all steps",
            secondaryHref: editHref,
            progress,
          },
          row: {
            kind: "profile-finish",
            title: "Finish your profile",
            subtitle: progress.doneLabel,
            href: editHref,
          },
        });
      }
    }

    // 4. verification-pending --------------------------------------------
    if (verificationPending) {
      live.push({
        kind: "verification-pending",
        primary: {
          kind: "verification-pending",
          tone: "calm",
          kicker: "Verification",
          title: "Your photo is with our team",
          body: "Most checks finish within a day. You can browse and like in the meantime.",
          primaryLabel: "Browse the deck",
          onPrimary: onOpenDeck,
          secondaryLabel: "What is checked",
          secondaryHref: "/verify",
          useIconTile: true,
        },
        row: {
          kind: "verification-pending",
          title: "Verification pending",
          subtitle: "Most checks finish within a day",
          href: "/verify",
        },
      });
    }

    // 5. add-city ----------------------------------------------------------
    const citySet = (profile as { citySet?: boolean }).citySet;
    if (citySet === false) {
      live.push({
        kind: "add-city",
        primary: {
          kind: "add-city",
          tone: "calm",
          kicker: "Suggestion",
          title: "Add your city",
          body: "Add your city to appear on the map when location sharing and map visibility are enabled.",
          primaryLabel: "Add city",
          primaryHref: "/profile/edit",
          secondaryLabel: "Appear on the map",
          secondaryHref: "/profile/edit",
        },
        row: {
          kind: "add-city",
          title: "Add your city",
          subtitle: "Appear on the map",
          href: "/profile/edit",
        },
      });
    }

    // 6. profile-nudge (answers / prompt cards) -----------------------
    const hasAnswers = Boolean(profile.promptCards && profile.promptCards.length > 0);
    if (!hasAnswers) {
      live.push({
        kind: "profile-nudge",
        primary: {
          kind: "profile-nudge",
          tone: "calm",
          kicker: "Suggestion",
          title: "Add two more answers",
          body: "Profiles with answers get more likes.",
          primaryLabel: "Add answers",
          primaryHref: "/profile/edit",
          secondaryLabel: "See profile",
          secondaryHref: "/profile/edit",
        },
        row: {
          kind: "profile-nudge",
          title: "Add two more answers",
          subtitle: "Profiles with answers get more likes",
          href: "/profile/edit",
        },
      });
    }

    // 7. premium-upsell ------------------------------------------------
    if (!isPremium(profile)) {
      live.push({
        kind: "premium-upsell",
        primary: {
          kind: "premium-upsell",
          tone: "calm",
          kicker: "Suggestion",
          title: "Try Premium",
          body: "See who viewed you.",
          primaryLabel: "Try Premium",
          primaryHref: "/paywall",
          secondaryLabel: "See who viewed you",
          secondaryHref: "/paywall",
        },
        row: {
          kind: "premium-upsell",
          title: "Try Premium",
          subtitle: "See who viewed you",
          href: "/paywall",
        },
      });
    }

    // 8. steady-deck fallback — only relevant when nothing above fired.
    if (live.length === 0 && deckCount > 0) {
      live.push({
        kind: "steady-deck",
        primary: {
          kind: "steady-deck",
          tone: "calm",
          kicker: "Today",
          title: `${deckCount} new ${deckCount === 1 ? "profile matches" : "profiles match"} what you are looking for`,
          // Second SOT sentence ("N are in countries you said you would
          // move to") is omitted — `relocation` is a single enum, not a
          // country list, so there is no real per-country count to show.
          primaryLabel: "Open the deck",
          onPrimary: onOpenDeck,
          secondaryLabel: "Adjust filters",
          onSecondary: onAdjustFilters,
        },
        row: {
          kind: "steady-deck",
          title: "Today's matches",
          subtitle: `${deckCount} new profiles`,
          href: "/discover",
        },
      });
    }

    const { primary, more } = selectNextAction(live);
    return {
      primary: primary?.primary ?? null,
      more: more.map((m) => m.row),
      loading: false,
    };
  }, [
    profile,
    profileLoaded,
    signalsLoaded,
    now,
    matches,
    verificationPending,
    failedMessage,
    deckCount,
    onOpenDeck,
    onAdjustFilters,
  ]);
}
