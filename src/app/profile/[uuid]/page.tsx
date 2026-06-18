"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ChevronLeft,
  EyeOff,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/kibo-ui/pill";

import { cn } from "@/lib/utils";

import { PageShell } from "@/components/app/page-shell";
import { EdgeStateShell } from "@/components/app/edge-state-shell";
import { EmptyState } from "@/components/app/empty-state";
import { PhotoTile } from "@/components/app/photo-tile";
import { ProgressDots } from "@/components/app/progress-dots";
import { CompatPill } from "@/components/app/compat-pill";
import { BlockReportSheet } from "@/components/app/block-report-sheet";
import { useProfile } from "@/lib/use-profile";
import { useDecisions } from "@/lib/use-decisions";
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";
import { photoOrGradient } from "@/lib/photo-or-gradient";
import { cdnUrlFor } from "@/lib/photo-storage";
import { TokenActionIcon } from "@/lib/icon-map";
import { useTokenBalance } from "@/lib/use-token-balance";
import { TokenSpendSheet } from "@/components/app/token-spend-sheet";
import { toast } from "sonner";

import {
  ASSEMBLIES,
  TORAH_LEVELS,
  SHABBATS,
  FEAST_DAYS,
  CALENDARS,
  POLYGYNY_VIEWS,
  HEAD_COVERINGS,
  TZITZIT_OPTIONS,
  FAMILY_VIEWS,
  LIVING_PREFERENCES,
  HEALTH_TAGS,
  INTERESTS,
  EDUCATIONS,
  ETHNICITIES,
  MARITAL_STATUSES,
  NATIONALITIES,
  PERSONALITY_TRAITS,
  VERIFICATION_TAGS,
  RELOCATIONS,
  COMMUNICATION_PREFS,
  BOUNDARY_TAGS,
  intentOptionsForSex,
} from "@/lib/profile-schema";
import { labelForLanguage } from "@/lib/languages";
import { sampleByName } from "@/lib/profile-sample";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Profile } from "@/lib/profile-schema";

// Adapter — backend GET /prospect-profile/<uuid> returns a rich JSON
// with snake_case fields. Map to the Profile shape the page reads.
// Many Torah-observant fields (assembly, torahLevel, shabbat, calendar,
// polygyny, headCovering, tzitzit) aren't modeled on the backend yet;
// they render empty for production users, which is acceptable for v1.
function adaptProspect(raw: Record<string, unknown>): Profile & { country?: string } {
  const loc = typeof raw.location === "string" ? raw.location : "";
  const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
  const country = parts[parts.length - 1];
  const city = parts[0];
  const has_kids = typeof raw.has_kids === "string" ? raw.has_kids.toLowerCase() : null;
  const children =
    has_kids === "yes" ? 1 : has_kids === "no" ? 0 : undefined;
  const gender = typeof raw.gender === "string" ? raw.gender.toLowerCase() : undefined;
  const sex: "male" | "female" | undefined =
    gender === "woman" ? "female" : gender === "man" ? "male" : undefined;
  // Backend ships photo_uuids as a position-ordered array. Convert to
  // PhotoRecord[] via cdnUrlFor so the carousel renders real images
  // instead of falling all the way through to the gradient stamp.
  const rawPhotoUuids = Array.isArray(raw.photo_uuids)
    ? (raw.photo_uuids as ReadonlyArray<unknown>).filter(
        (u): u is string => typeof u === "string" && u.length > 0,
      )
    : [];
  const photos = rawPhotoUuids.map((uuid, i) => ({
    uuid,
    cdn_url: cdnUrlFor(uuid),
    position: i + 1,
    moderation_state: "approved" as const,
    nsfw_score: null,
    created_at: "",
  }));
  // Strings are "Unanswered" sentinels when the user hasn't filled the
  // field — squash those to undefined so the detail page hides the
  // section rather than rendering "Unanswered" as the value.
  const stringOrUndef = (v: unknown): string | undefined => {
    if (typeof v !== "string") return undefined;
    const trimmed = v.trim();
    if (!trimmed || trimmed === "Unanswered") return undefined;
    return trimmed;
  };
  // Backend `relationship_status` -> Profile.maritalStatus enum.
  const RELATIONSHIP_REVERSE: Record<string, Profile["maritalStatus"]> = {
    Single: "never-married",
    Married: "married",
    Divorced: "divorced",
    Widowed: "widowed",
  };
  const relStatus = stringOrUndef(raw.relationship_status);
  const maritalStatus = relStatus ? RELATIONSHIP_REVERSE[relStatus] : undefined;
  // Education + occupation are free-text on the backend; we render them
  // as-is on the detail page. EducationLevel is an enum on the schema but
  // the page falls through to the raw string via labelOf ?? raw.
  const occupation = stringOrUndef(raw.occupation);
  const education = stringOrUndef(raw.education) as Profile["education"] | undefined;
  // Map smoking/drinking/exercise/drugs to the page's healthTags pill
  // cluster so users see lifestyle info post-onboard. These are
  // Yes/No/Frequency enums on the backend; keep the most informative.
  const healthTags: Profile["healthTags"] = [];
  if (stringOrUndef(raw.smoking) === "No") healthTags.push("non-smoker");
  if (stringOrUndef(raw.drinking) === "No") healthTags.push("no-alcohol");
  if (
    stringOrUndef(raw.drinking) === "Occasionally" ||
    stringOrUndef(raw.drinking) === "Often" ||
    stringOrUndef(raw.drinking) === "Sometimes"
  ) {
    healthTags.push("moderate-alcohol");
  }
  if (
    stringOrUndef(raw.exercise) === "Often" ||
    stringOrUndef(raw.exercise) === "Sometimes"
  ) {
    healthTags.push("fitness");
  }
  // ahavah_extra carries the Torah-observant fields (assembly,
  // torahLevel, shabbat, polygyny, etc.) that don't have first-class
  // backend columns. Spread it onto the returned Profile so the
  // detail page's faith / doctrine / lifestyle sections actually
  // render for users who filled them during onboarding.
  const extras: Record<string, unknown> = {};
  if (
    raw.ahavah_extra &&
    typeof raw.ahavah_extra === "object" &&
    !Array.isArray(raw.ahavah_extra)
  ) {
    for (const [k, v] of Object.entries(raw.ahavah_extra as Record<string, unknown>)) {
      if (v !== null && v !== undefined) extras[k] = v;
    }
  }
  // assembly went multi-select 2026-05-19 (Assembly[]). Pre-existing
  // profiles stored a single string in ahavah_extra.assembly; the detail
  // page now calls profile.assembly.map(...), so a raw string would throw
  // "x.map is not a function" and crash the page. Normalise string ->
  // one-element array here, mirroring translateInbound in use-profile.ts.
  if (typeof extras.assembly === "string") {
    extras.assembly = [extras.assembly];
  }
  // intent went multi-select 2026-06-16 (Intent[]). Pre-existing profiles
  // stored a single string in ahavah_extra.intent; formatIntent is already
  // defensive, but normalise string -> one-element array here so the spread
  // value matches the Intent[] type, mirroring assembly above.
  if (typeof extras.intent === "string") {
    extras.intent = [extras.intent];
  }
  // Derive verificationTags from real backend signals — was previously
  // mock-only via profile-sample data, so live peers always rendered an
  // empty Verified cluster regardless of their tier. Maps real signals
  // onto the existing VerificationTag enum (profile-schema.ts:735) so
  // the cluster surfaces what the user has actually earned.
  //   Bronze (selfie+photo cross-check) → 'video-selfie'
  //   Gold   (Stripe Identity verified) → 'government-id'
  // Silver tier is intentionally a stub; nothing maps to 'assembly' or
  // 'community-references' yet.
  const verifiedTags: Profile["verificationTags"] = [];
  const tier =
    typeof raw.ahavah_verification_tier === "string"
      ? raw.ahavah_verification_tier
      : "none";
  if (raw.verified_age || raw.verified_gender || raw.verified_ethnicity || tier !== "none") {
    verifiedTags.push("video-selfie");
  }
  if (tier === "gold") {
    verifiedTags.push("government-id");
  }
  return {
    firstName: stringOrUndef(raw.name),
    age: typeof raw.age === "number" ? raw.age : undefined,
    bio: stringOrUndef(raw.about),
    city,
    country,
    sex,
    children,
    maritalStatus,
    occupation,
    education,
    healthTags: healthTags.length ? healthTags : undefined,
    photos,
    // Pass-through looking_for raw value as a one-element array (intent is
    // multi-select / Intent[] as of 2026-06-16). formatIntent falls back to
    // the raw value when labelOf misses the backend's strings ("Long-term
    // dating", "Marriage"), which aren't in the Torah-observant Intent enum.
    // This coarse value is overridden by ahavah_extra.intent (the precise
    // array) when present — it's spread LAST below.
    intent:
      typeof raw.looking_for === "string"
        ? ([raw.looking_for] as Profile["intent"])
        : undefined,
    // Languages — server ships `languages_spoken: TEXT[]` (migration
    // 0001). Filter to strings to satisfy ReadonlyArray<string>.
    languages: Array.isArray(raw.languages_spoken)
      ? (raw.languages_spoken.filter((x) => typeof x === "string") as string[])
      : undefined,
    primaryLanguage:
      typeof raw.primary_language === "string"
        ? raw.primary_language
        : undefined,
    // Real verificationTags derived above from ahavah_verification_tier
    // + verified_age/gender/ethnicity. Empty list means the user hasn't
    // completed any verification step.
    verificationTags: verifiedTags.length > 0 ? verifiedTags : undefined,
    // Truncated profile: backend returns `limited: true` for a hidden member.
    limited: raw.limited === true,
    // Spread Torah-observant fields LAST so they overwrite the
    // narrower mappings above (e.g. ahavah_extra.healthTags from
    // onboarding should win over the smoking/drinking-derived list).
    // ahavah_extra.verificationTags from old mock data is intentionally
    // shadowed by the server-derived list above — delete it before
    // spreading so a stale onboarding draft can't re-poison the page.
    ...(() => {
      const cleaned = { ...extras };
      delete cleaned.verificationTags;
      return cleaned;
    })(),
  } as Profile & { country?: string };
}

type Props = { params: Promise<{ uuid: string }> };

function labelOf<T extends string>(
  value: T,
  options: ReadonlyArray<{ value: T; label: string }>
): string | undefined {
  return options.find((opt) => opt.value === value)?.label;
}

// Intent is multi-value in the data (e.g. ["courtship","unmarried-man"] — a
// relationship type plus a partner-status dimension), even though the type
// models a single value. Normalise to an array and label each, so it renders
// "Courtship, Unmarried man" instead of the joined raw "courtshipunmarried-man".
function formatIntent(
  intent: unknown,
  sex: Profile["sex"],
): string | undefined {
  if (intent == null) return undefined;
  const options = sex ? intentOptionsForSex(sex) : [];
  const values = (Array.isArray(intent) ? intent : [intent]).filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (!values.length) return undefined;
  return values
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .join(", ");
}

export default function ProfileDetailPage({ params }: Props) {
  const { uuid } = use(params);
  // Try backend first; fall back to sampleByName for legacy/test URLs
  // (where uuid is actually a sample firstName like 'sarah'). Loading
  // and 404 are surfaced explicitly so the page never shows stale data
  // for a uuid the backend doesn't know about.
  const [fetched, setFetched] = useState<Profile | null>(null);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "ready" | "not-found" | "error">("idle");
  useEffect(() => {
    // Sample fallback first — keeps prototype URLs working in dev.
    const fallback = sampleByName(uuid);
    if (fallback && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(uuid)) {
      // It's a non-UUID string and we have a sample match — use it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFetched(fallback);
      setFetchState("ready");
      return;
    }
    // Real UUID — fetch from backend.
    setFetchState("loading");
    let cancelled = false;
    apiClient
      .get<Record<string, unknown>>(`/prospect-profile/${uuid}`)
      .then((raw) => {
        if (cancelled) return;
        setFetched(adaptProspect(raw));
        setFetchState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setFetchState("not-found");
        } else {
          setFetchState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);
  const profile = fetched;
  const { profile: userProfile, loaded: profileLoaded } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { decide } = useDecisions();

  // Back-button target — route back to whichever surface launched
  // this profile view. /discover swipe-up and /map marker tap both
  // append ?from=<surface>; /matches card tap goes straight to /chat,
  // so 'matches' is handled by the chat header instead.
  const from = searchParams.get("from");
  const backHref =
    from === "map"
      ? "/map"
      : from === "matches" || from === "match"
        ? "/matches"
        : from === "likes"
          ? "/matches?tab=likes"
          : "/discover";
  const backLabel =
    from === "map"
      ? "Back to map"
      : from === "matches" || from === "match"
        ? "Back to matches"
        : from === "likes"
          ? "Back to Liked you"
          : "Back to discover";

  // Super-like spend path — mirrors /discover's handleSuperLike, adapted to
  // act on this profile's uuid and return to the launching surface on success.
  const [superSheetOpen, setSuperSheetOpen] = useState(false);
  const [superBusy, setSuperBusy] = useState(false);
  const {
    state: tokenBalanceState,
    balance: tokenBalance,
    refresh: refreshTokens,
  } = useTokenBalance();
  const tokenBalanceForSheet =
    tokenBalanceState === "happy" ? tokenBalance : null;

  const handleSuperLike = useCallback(async () => {
    setSuperBusy(true);
    try {
      const res = await apiClient.post<{
        super_liked: boolean;
        match_id: string | null;
      }>("/tokens/super-like", { person_id: uuid });
      await refreshTokens();
      setSuperSheetOpen(false);
      if (res.match_id) {
        router.push(`/match?matchId=${encodeURIComponent(res.match_id)}`);
        return;
      }
      router.push(backHref);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        await refreshTokens();
        toast.error("Not enough tokens for Super Like.");
      } else {
        setSuperSheetOpen(false);
        const status = e instanceof ApiError ? e.status : null;
        const msg =
          status === 404
            ? "Super Like isn't available yet."
            : status === 401
              ? "Sign in to send a Super Like."
              : status === 503
                ? "Super Like is temporarily unavailable."
                : "Couldn't send Super Like. Try again.";
        toast.error(msg);
      }
    } finally {
      setSuperBusy(false);
    }
  }, [uuid, refreshTokens, router, backHref]);

  // Swipe-down-to-dismiss — pairs with /discover's swipe-up-to-open
  // for gestural symmetry. Only active when ?from=discover so it
  // doesn't hijack scrolling on /map / /matches entries.
  //
  // Implemented with raw touch handlers (NOT motion drag) so the
  // page's native vertical scrolling stays intact: we only count
  // the gesture as "dismiss" when (a) the page is scrolled to the
  // very top at gesture start AND (b) the user pulled down at
  // least 100px (or 60px with strong velocity). Anywhere else and
  // it's a normal scroll, untouched.
  useEffect(() => {
    if (from !== "discover") return;
    if (typeof window === "undefined") return;
    let start: { y: number; scrollY: number; t: number } | null = null;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      start = {
        y: e.touches[0].clientY,
        scrollY: window.scrollY,
        t: Date.now(),
      };
    };
    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      if (!s) return;
      // Only trigger when the page started AT the top — otherwise the
      // user was just scrolling and we'd hijack their gesture.
      if (s.scrollY > 4) return;
      const last = e.changedTouches[0];
      if (!last) return;
      const dy = last.clientY - s.y;
      const dt = Math.max(1, Date.now() - s.t);
      const velocity = dy / dt; // px / ms; positive = downward
      if (dy > 100 || (dy > 60 && velocity > 0.4)) {
        router.push(backHref);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [from, backHref, router]);

  // Photo carousel — slot count is the actual photos length (clamped
  // 1..7 to mirror the editor cap MAX_PHOTO_POSITION on /profile/edit).
  // Was previously clamped at 3 which silently hid photos 4-7 from peer
  // viewers even when the user had uploaded all seven. When a slot is
  // empty for a thin profile, photoOrGradient returns the deterministic
  // gradient seeded on the prospect uuid for stability across reloads.
  const photoSlots = Math.max(1, Math.min(profile?.photos?.length ?? 1, 7));
  const photoSources = useMemo(
    () =>
      Array.from({ length: photoSlots }, (_, i) =>
        photoOrGradient(
          { firstName: uuid, photos: profile?.photos },
          i,
        ),
      ),
    [uuid, profile?.photos, photoSlots],
  );
  const [photoIndex, setPhotoIndex] = useState(0);
  const nextPhoto = () =>
    setPhotoIndex((i) => (i + 1) % photoSources.length);
  const prevPhoto = () =>
    setPhotoIndex((i) => (i - 1 + photoSources.length) % photoSources.length);
  const currentPhotoSource = photoSources[photoIndex];

  // Match-gated chat: viewer can only see the Message button on this
  // profile when there's a confirmed mutual match with the prospect.
  // /matches is small (single-digit to low-tens of entries usually) so
  // fetching the whole list and checking membership is fine — no need
  // for a dedicated /matches/<peer> probe endpoint.
  const [isMatched, setIsMatched] = useState(false);
  useEffect(() => {
    if (!uuid) return;
    let cancelled = false;
    void apiClient
      .get<{ matches?: Array<{ with_profile?: { id?: string } }> }>("/matches")
      .then((res) => {
        if (cancelled) return;
        const list = res.matches ?? [];
        setIsMatched(list.some((m) => m.with_profile?.id === uuid));
      })
      .catch(() => {
        // Quiet fail — leave isMatched=false; user can still Like to
        // (re-)create the match if they haven't yet.
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  // BlockReportSheet wiring for the kebab — same pattern as /chat.
  const [reportOpen, setReportOpen] = useState(false);

  // Compute compatibility between viewer and prospect. With sparse
  // profiles (e.g. fresh production users where Duolicious schema
  // doesn't store the Torah-observant fields), most axes return their
  // 0.5 no-data neutral default → the composite score is mostly noise
  // around 50%. We compute it but only surface the pill when enough
  // axes have signal to make the number meaningful.
  const compatResult = userProfile && profile
    ? computeCompatibility(userProfile, profile)
    : null;
  const meaningfulAxes = compatResult
    ? Object.values(compatResult.breakdown).filter(
        // 0.5 is the documented no-data return across every rule.
        // Treat anything outside the [0.45, 0.55] band as carrying
        // real signal — tolerates rounding without false negatives.
        (v) => v < 0.45 || v > 0.55,
      ).length
    : 0;
  // Need at least 2 informative axes before the % is more meaningful
  // than the underlying neutral baseline. Below that, hide it rather
  // than mislead the viewer about a "real" compatibility number.
  const showCompatPill = compatResult !== null && meaningfulAxes >= 2;

  if (fetchState === "loading" || fetchState === "idle") {
    return (
      <PageShell bottomPad="none">
        <div className="flex flex-1 items-center justify-center px-5">
          <p className="text-body text-(--ink-2)" aria-live="polite">
            Loading profile…
          </p>
        </div>
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <EdgeStateShell srTitle="Profile unavailable">
        <EmptyState
          variant="profile-unavailable"
          action={{ label: "Back to discover", href: "/discover" }}
        />
      </EdgeStateShell>
    );
  }

  // ── Shared JSX fragments (same state, used by mobile + desktop) ──

  // The photo carousel (reused in both layouts).
  // Photo carousel as a parameterised function so mobile and desktop can
  // position the compat pill at different anchors without duplicating the
  // entire PhotoTile + ProgressDots + top-chrome composition. Caller passes
  // `compatPos` to control whether/where the CompatPill renders:
  //   - "mobile"  → bottom-12 right-4 (clears the floating BottomNav)
  //   - "desktop" → bottom-6 right-6  (canonical desktop position per
  //                 docs/handoff-desktop/desktop.jsx ProfileDetailDesktop)
  //   - "none"    → caller renders its own overlay outside this tile
  const renderPhotoCarousel = (
    compatPos: "mobile" | "desktop" | "none" = "mobile",
  ) => (
    <PhotoTile
      aspect="4/5"
      radius="none"
      surface="none"
      bg="transparent"
      className="w-full"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={photoIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0"
          style={
            currentPhotoSource.kind === "gradient"
              ? { background: currentPhotoSource.css }
              : undefined
          }
        >
          {currentPhotoSource.kind === "photo" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentPhotoSource.src}
              alt={`${profile?.firstName ?? "Profile"} photo ${photoIndex + 1}`}
              className="size-full object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tap zones */}
      <button
        type="button"
        aria-label="Previous photo"
        onClick={prevPhoto}
        className="absolute inset-y-0 left-0 z-0 w-1/2 cursor-default outline-none focus-visible:bg-black/10"
      />
      <button
        type="button"
        aria-label="Next photo"
        onClick={nextPhoto}
        className="absolute inset-y-0 right-0 z-0 w-1/2 cursor-default outline-none focus-visible:bg-black/10"
      />

      {/* Top chrome */}
      <div className="absolute top-3 right-3 left-3 z-10 flex items-center justify-between">
        <Link
          href={backHref}
          prefetch={false}
          aria-label={backLabel}
          className={cn(buttonVariants({ size: "circle-lg", tone: "overlay" }))}
        >
          <ChevronLeft className="text-(--ink)" />
        </Link>
        <Button
          size="circle-lg"
          tone="overlay"
          aria-label="More options"
          onClick={() => setReportOpen(true)}
        >
          <MoreHorizontal className="text-(--ink)" />
        </Button>
      </div>

      <ProgressDots
        count={photoSources.length}
        active={photoIndex}
        size="sm"
        tone="white"
        className="absolute top-3 left-1/2 z-10 -translate-x-1/2"
      />

      {showCompatPill && compatResult && compatPos !== "none" && (
        <div
          className={cn(
            "absolute z-10",
            compatPos === "mobile" ? "bottom-12 right-4" : "bottom-6 right-6",
          )}
        >
          <CompatPill
            score={compatResult.score}
            breakdown={compatResult.breakdown}
            size="sm"
          />
        </div>
      )}
    </PhotoTile>
  );

  // The full bio content (all sections) -- shared between mobile card and desktop right col.
  const bioContent = (
    <div className="flex flex-col gap-5">
      {/* Header: name, age, location */}
      <div>
        <h1 className="text-h1 text-(--ink)">
          {profile.firstName}, {profile.age}
        </h1>
        {profile.displayName && profile.displayName !== profile.firstName ? (
          <p className="mt-0.5 text-meta italic text-(--ink-2)">
            also known as &ldquo;{profile.displayName}&rdquo;
          </p>
        ) : null}
        {profile.country && (
          <p className="mt-1 flex items-center gap-1.5 text-meta text-(--ink-2)">
            <MapPin className="size-3" /> {profile.country}
          </p>
        )}
        {(profile.nationality ||
          profile.maritalStatus !== undefined ||
          profile.children !== undefined ||
          (profile.ethnicities && profile.ethnicities.length > 0)) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.nationality && (
              <Pill variant="lavender" size="sm">
                {labelOf(profile.nationality, NATIONALITIES) ?? profile.nationality}
              </Pill>
            )}
            {profile.ethnicities?.map((eth) => (
              <Pill key={eth} variant="lavender" size="sm">
                {labelOf(eth, ETHNICITIES) ?? eth}
              </Pill>
            ))}
            {profile.maritalStatus !== undefined && (
              <Pill variant="lavender" size="sm">
                {labelOf(profile.maritalStatus, MARITAL_STATUSES) ?? profile.maritalStatus}
              </Pill>
            )}
            {profile.children !== undefined && (
              <Pill variant="lavender" size="sm">
                {profile.children === 1 ? "1 child" : `${profile.children} children`}
              </Pill>
            )}
          </div>
        )}
      </div>

      {profile.bio && (
        <p className="text-body leading-relaxed text-(--ink)/85">{profile.bio}</p>
      )}

      {(profile.occupation || profile.education || profile.sex) && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-meta font-semibold uppercase text-(--ink-2)">
            About
          </h2>
          <dl className="space-y-2">
            {profile.sex && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Gender:</dt>
                <dd className="text-meta text-(--ink)">
                  {profile.sex === "female" ? "Woman" : "Man"}
                </dd>
              </div>
            )}
            {profile.occupation && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Work:</dt>
                <dd className="text-meta text-(--ink)">{profile.occupation}</dd>
              </div>
            )}
            {profile.education && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Education:</dt>
                <dd className="text-meta text-(--ink)">
                  {labelOf(profile.education, EDUCATIONS) ?? profile.education}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {profile.languages?.length ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-meta font-semibold uppercase text-(--ink-2)">
            Languages
          </h2>
          <div className="flex flex-wrap gap-2">
            {[...profile.languages]
              .sort((a, b) =>
                a === profile.primaryLanguage
                  ? -1
                  : b === profile.primaryLanguage
                    ? 1
                    : 0,
              )
              .map((code) => (
                <Pill key={code} variant="lavender" size="sm">
                  {code === profile.primaryLanguage ? "★ " : ""}
                  {labelForLanguage(code)}
                </Pill>
              ))}
          </div>
        </div>
      ) : null}

      {(profile.intent ||
        profile.relocation ||
        profile.communicationPrefs?.length ||
        profile.boundaryTags?.length) && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-meta font-semibold uppercase text-(--ink-2)">
            Looking for
          </h2>
          <dl className="space-y-2">
            {profile.intent && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Intent:</dt>
                <dd className="text-meta text-(--ink)">
                  {formatIntent(profile.intent, profile.sex)}
                </dd>
              </div>
            )}
            {profile.relocation && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Relocation:</dt>
                <dd className="text-meta text-(--ink)">
                  {labelOf(profile.relocation, RELOCATIONS)}
                </dd>
              </div>
            )}
          </dl>
          {profile.communicationPrefs?.length ? (
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-caption text-(--ink-2)">
                Communication style
              </span>
              <div className="flex flex-wrap gap-2">
                {profile.communicationPrefs.map((pref) => (
                  <Pill key={pref} variant="lavender" size="sm">
                    {labelOf(pref, COMMUNICATION_PREFS) ?? pref}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}
          {profile.boundaryTags?.length ? (
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-caption text-(--ink-2)">Boundaries</span>
              <div className="flex flex-wrap gap-2">
                {profile.boundaryTags.map((tag) => (
                  <Pill key={tag} variant="lavender" size="sm">
                    {labelOf(tag, BOUNDARY_TAGS) ?? tag}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {(profile.assembly?.length ||
        profile.torahLevel ||
        profile.shabbat ||
        profile.calendar ||
        profile.feastDays?.length) && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-meta font-semibold uppercase text-(--ink-2)">
            Faith
          </h2>
          {profile.assembly?.length ? (
            <div className="flex flex-col gap-1">
              <span className="text-caption text-(--ink-2)">Identifies as</span>
              <div className="flex flex-wrap gap-2">
                {profile.assembly.map((a) => (
                  <Pill key={a} variant="lavender" size="sm">
                    {labelOf(a, ASSEMBLIES) ?? a}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}
          <dl className="space-y-2">
            {profile.torahLevel && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Torah stage:</dt>
                <dd className="text-meta text-(--ink)">
                  {labelOf(profile.torahLevel, TORAH_LEVELS)}
                </dd>
              </div>
            )}
            {profile.shabbat && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Shabbat:</dt>
                <dd className="text-meta text-(--ink)">
                  {labelOf(profile.shabbat, SHABBATS)}
                </dd>
              </div>
            )}
            {profile.calendar && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Calendar:</dt>
                <dd className="text-meta text-(--ink)">
                  {labelOf(profile.calendar, CALENDARS)}
                </dd>
              </div>
            )}
          </dl>
          {profile.feastDays?.length ? (
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-caption text-(--ink-2)">Feast days kept</span>
              <div className="flex flex-wrap gap-2">
                {profile.feastDays.map((day) => (
                  <Pill key={day} variant="lavender" size="sm">
                    {labelOf(day, FEAST_DAYS) ?? day}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {(profile.polygyny || profile.headCovering || profile.tzitzit) && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-meta font-semibold uppercase text-(--ink-2)">
            Doctrine
          </h2>
          <dl className="space-y-2">
            {profile.polygyny && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Polygyny:</dt>
                <dd className="text-meta text-(--ink)">
                  {labelOf(profile.polygyny, POLYGYNY_VIEWS)}
                </dd>
              </div>
            )}
            {profile.headCovering && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Head covering:</dt>
                <dd className="text-meta text-(--ink)">
                  {labelOf(profile.headCovering, HEAD_COVERINGS)}
                </dd>
              </div>
            )}
            {profile.tzitzit && (
              <div className="flex gap-2">
                <dt className="text-meta text-(--ink-2)">Tzitzit:</dt>
                <dd className="text-meta text-(--ink)">
                  {labelOf(profile.tzitzit, TZITZIT_OPTIONS)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {(profile.familyViews?.length ||
        profile.livingPreferences?.length ||
        profile.healthTags?.length) && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-meta font-semibold uppercase text-(--ink-2)">
            Lifestyle
          </h2>
          {profile.familyViews?.length && (
            <div className="flex flex-wrap gap-2">
              {profile.familyViews.map((view) => (
                <Pill key={view} variant="lavender" size="sm">
                  {labelOf(view, FAMILY_VIEWS)}
                </Pill>
              ))}
            </div>
          )}
          {profile.livingPreferences?.length && (
            <div className="flex flex-wrap gap-2">
              {profile.livingPreferences.map((pref) => (
                <Pill key={pref} variant="lavender" size="sm">
                  {labelOf(pref, LIVING_PREFERENCES)}
                </Pill>
              ))}
            </div>
          )}
          {profile.healthTags?.length && (
            <div className="flex flex-wrap gap-2">
              {profile.healthTags.map((tag) => (
                <Pill key={tag} variant="lavender" size="sm">
                  {labelOf(tag, HEALTH_TAGS)}
                </Pill>
              ))}
            </div>
          )}
        </div>
      )}

      {profile.interests?.length && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-meta font-semibold uppercase text-(--ink-2)">
            Interests
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <Pill key={interest} variant="lime" size="sm">
                {labelOf(interest, INTERESTS)}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {profile.personalityTraits?.length && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-meta font-semibold uppercase text-(--ink-2)">
            Personality
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.personalityTraits.map((trait) => (
              <Pill key={trait} variant="lavender" size="sm">
                {labelOf(trait, PERSONALITY_TRAITS)}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {profile.verificationTags?.length && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="flex items-center gap-1.5 text-meta font-semibold uppercase text-(--ink-2)">
            <ShieldCheck className="size-4" /> Verified
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.verificationTags.map((tag) => (
              <Pill key={tag} variant="lime" size="sm">
                {labelOf(tag, VERIFICATION_TAGS)}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // The action row (Like / Pass / Message) -- shared by both layouts.
  const profileActionRow = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2, ease: "easeOut" }}
      className="mt-2 flex items-center justify-center gap-5"
    >
      {isMatched ? (
        <Button
          nativeButton={false}
          size="circle-xl"
          tone="cta"
          lift="float"
          aria-label="Message"
          render={<Link href={`/chat/${uuid}`} prefetch={false} />}
        >
          <MessageCircle className="text-black" />
        </Button>
      ) : (
        <>
          {/* Same action language as /discover (Pass=cta lime, Like=action
              pink, Super=brand lavender), arranged symmetrically with the
              smaller Super-like accent centred between the primary pair.
              Rewind is deck-only and intentionally omitted here. */}
          <Button
            size="circle-2xl"
            tone="cta"
            lift="float"
            aria-label="Pass"
            disabled={!profileLoaded}
            onClick={async () => {
              try {
                await decide(uuid, "nope");
              } catch {
                // surfaced via useDecisions().error
              }
              router.push(backHref);
            }}
          >
            <X className="size-7 text-black" strokeWidth={2.4} />
          </Button>
          <Button
            size="circle-xl"
            tone="brand"
            lift="float"
            aria-label="Super like, costs 2 tokens"
            disabled={!profileLoaded}
            onClick={() => setSuperSheetOpen(true)}
          >
            <TokenActionIcon.SuperLike
              className="size-6 text-black"
              fill="currentColor"
            />
          </Button>
          <Button
            size="circle-2xl"
            tone="action"
            lift="float"
            aria-label="Like"
            disabled={!profileLoaded}
            onClick={async () => {
              try {
                const result = await decide(uuid, "like");
                if (result.kind === "ok" && result.matchId) {
                  router.push(
                    `/match?matchId=${encodeURIComponent(result.matchId)}`,
                  );
                  return;
                }
              } catch {
                // surfaced via useDecisions().error
              }
              router.push(backHref);
            }}
          >
            <TokenActionIcon.Like
              className="size-7 text-black"
              fill="currentColor"
            />
          </Button>
        </>
      )}
    </motion.div>
  );

  // Truncated view for a hidden member (backend `limited: true`). A real,
  // sparse profile -- primary photo + name/age + verified + "looking for" +
  // Like -- NOT the dead-end "unavailable" state. Reuses the photo carousel
  // (single photo, no compat pill) and the same like -> match flow.
  if (profile.limited) {
    return (
      <PageShell bottomPad="default" desktopShell="sidebar">
        <div className="mx-auto flex w-full max-w-md flex-col">
          {renderPhotoCarousel("none")}
          <div className="flex flex-col gap-5 px-5 py-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-h1 text-(--ink)">
                {profile.firstName}
                {profile.age ? `, ${profile.age}` : ""}
              </h1>
              {profile.verificationTags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.verificationTags.map((tag) => (
                    <Pill key={tag} variant="lime" size="sm">
                      {labelOf(tag, VERIFICATION_TAGS)}
                    </Pill>
                  ))}
                </div>
              ) : null}
              {profile.intent ? (
                <p className="text-meta text-(--ink-2)">
                  Looking for{" "}
                  <span className="font-semibold text-(--ink)">
                    {formatIntent(profile.intent, profile.sex)}
                  </span>
                </p>
              ) : null}
            </div>

            <Card className="rounded-2xl">
              <CardContent className="flex items-start gap-3 px-4 py-4">
                <EyeOff className="size-5 shrink-0 text-lavender" />
                <p className="min-w-0 text-meta text-(--ink-2)">
                  This member keeps a private profile. Full details unlock when
                  you match.
                </p>
              </CardContent>
            </Card>

            <Button
              tone="action"
              size="lg"
              className="w-full gap-2"
              disabled={!profileLoaded}
              onClick={async () => {
                try {
                  const result = await decide(uuid, "like");
                  if (result.kind === "ok" && result.matchId) {
                    router.push(
                      `/match?matchId=${encodeURIComponent(result.matchId)}`,
                    );
                    return;
                  }
                } catch {
                  // surfaced via useDecisions().error
                }
                router.push(backHref);
              }}
            >
              <TokenActionIcon.Like
                className="size-5 text-black"
                fill="currentColor"
              />
              Like {profile.firstName}
            </Button>
          </div>
        </div>
        <BlockReportSheet
          open={reportOpen}
          onOpenChange={setReportOpen}
          subjectName={profile.firstName ?? "this person"}
          onSubmit={async (payload) => {
            const reason = payload.details
              ? `${payload.category}: ${payload.details}`
              : payload.category;
            await apiClient.post(`/skip/by-uuid/${uuid}`, { report_reason: reason });
            router.push("/discover");
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell bottomPad="none" desktopShell="sidebar">
      {/* ── Mobile layout (<md): original card-over-photo design ───── */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          {renderPhotoCarousel("mobile")}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <Card
            tone="overlap"
            className="relative z-20 -mt-8 gap-5 rounded-t-3xl px-5 pt-6 pb-6"
          >
            <CardContent className="flex flex-col gap-5 px-0">
              {bioContent}
              {profileActionRow}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Desktop layout (>=md): canonical 2-col 540px / 1fr ─────── */}
      {/*
        Port of `ProfileDetailDesktop` from docs/handoff-desktop/desktop.jsx
        lines 907–1110. Kit primitives only — no hand-rolled bg/border divs
        in place of <Card>, no bare <button> divs in place of <Button>.
        Reads the same hooks/state declared at the top of this component.
      */}
      {/* eslint-disable-next-line no-restricted-syntax -- calc(100dvh - topbar) has no token equivalent */}
      <div className="hidden md:grid grid-cols-[minmax(380px,520px)_1fr] gap-8 px-8 pt-6 pb-8 overflow-hidden min-h-[calc(100dvh-56px)]">
        {/* Left col — back link + photo card + 4-col thumbnail strip */}
        <div className="flex flex-col gap-3.5 overflow-hidden min-w-0">
          <Link
            href={backHref}
            prefetch={false}
            className="inline-flex items-center gap-2.5 text-sm text-(--ink-2) hover:text-(--ink)"
          >
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>

          {/* Main photo card — Card tone="elevated", 4/5 aspect, holds the
              timeline strip + huge centered initial + lavender compat pill */}
          <Card
            tone="elevated"
            className="relative aspect-[4/5] overflow-hidden p-0 rounded-3xl"
          >
            {/* Photo carousel rendered with the canonical desktop compat-pill
                position (bottom-6 right-6, per ProfileDetailDesktop in
                docs/handoff-desktop/desktop.jsx lines 942–949). The pill
                is rendered ONCE by renderPhotoCarousel — no duplicate
                wrapper pill on the card. The variant/colour comes from
                CompatPill.getVariant() based on the score band (lime ≥85,
                lavender 65–84, pink <65). */}
            <div className="absolute inset-0">
              {renderPhotoCarousel("desktop")}
            </div>
          </Card>

          {/* 4-col thumbnail strip — actual photo slots, active one ringed */}
          <div className="grid grid-cols-4 gap-2.5">
            {photoSources.slice(0, 4).map((src, i) => {
              const isActive = i === photoIndex;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Photo ${i + 1}`}
                  onClick={() => setPhotoIndex(i)}
                  className={cn(
                    // border (not ring) — canonical desktop.jsx:951–957 uses
                    // `border: "2px solid var(--lime)"` for the active
                    // thumbnail. Tailwind's `ring-*` renders as box-shadow
                    // OUTSIDE the element and gets clipped by the parent
                    // overflow:hidden wrappers (lines 1022, 1024 above);
                    // a border renders INSIDE the box-sizing:border-box and
                    // is never clipped.
                    "aspect-square overflow-hidden rounded-xl border-2 transition",
                    isActive
                      ? "border-lime opacity-100"
                      : "border-transparent opacity-65 hover:opacity-90",
                  )}
                  style={
                    src.kind === "gradient"
                      ? { background: src.css }
                      : undefined
                  }
                >
                  {src.kind === "photo" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src.src}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right col — header row (name + action stack) + scrollable body */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col gap-6 overflow-hidden min-w-0"
        >
          {/* Header: name + map-pin + 5 lavender pill cluster LEFT,
              160px-wide vertical action stack RIGHT */}
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="m-0 text-display-lg text-(--ink)">
                {profile.firstName}, {profile.age}
              </h1>
              {profile.displayName &&
              profile.displayName !== profile.firstName ? (
                <p className="mt-1 text-sm italic text-(--ink-2)">
                  also known as &ldquo;{profile.displayName}&rdquo;
                </p>
              ) : null}
              {(profile.city || profile.country) && (
                <p className="mt-2.5 flex items-center gap-1.5 text-meta text-(--ink-2)">
                  <MapPin className="size-3.5" />
                  {[profile.city, profile.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {/* 5 inline lavender pills — nationality / ethnicity /
                  marital / children / intent */}
              {(profile.nationality ||
                profile.maritalStatus !== undefined ||
                profile.children !== undefined ||
                profile.intent ||
                (profile.ethnicities && profile.ethnicities.length > 0)) && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {profile.nationality && (
                    <Pill variant="lavender" size="sm">
                      {labelOf(profile.nationality, NATIONALITIES) ??
                        profile.nationality}
                    </Pill>
                  )}
                  {profile.ethnicities?.map((eth) => (
                    <Pill key={eth} variant="lavender" size="sm">
                      {labelOf(eth, ETHNICITIES) ?? eth}
                    </Pill>
                  ))}
                  {profile.maritalStatus !== undefined && (
                    <Pill variant="lavender" size="sm">
                      {labelOf(profile.maritalStatus, MARITAL_STATUSES) ??
                        profile.maritalStatus}
                    </Pill>
                  )}
                  {profile.children !== undefined && (
                    <Pill variant="lavender" size="sm">
                      {profile.children === 1
                        ? "1 child"
                        : `${profile.children} children`}
                    </Pill>
                  )}
                  {profile.intent && (
                    <Pill variant="lavender" size="sm">
                      {formatIntent(profile.intent, profile.sex)}
                    </Pill>
                  )}
                </div>
              )}
            </div>

            {/* Vertical action stack — 160px wide, Like (lime 48h) +
                Message (lavender 48h; visually disabled when unmatched) +
                Pass (outline 40h) */}
            <div className="flex w-40 shrink-0 flex-col gap-3">
              <Button
                size="tap"
                tone="cta"
                className="h-12 w-full font-bold"
                disabled={!profileLoaded}
                onClick={async () => {
                  try {
                    const result = await decide(uuid, "like");
                    if (result.kind === "ok" && result.matchId) {
                      router.push(
                        `/match?matchId=${encodeURIComponent(result.matchId)}`,
                      );
                      return;
                    }
                  } catch {
                    // surfaced via useDecisions().error
                  }
                  router.push(backHref);
                }}
              >
                <Heart className="size-4" fill="currentColor" />
                Like
              </Button>
              {isMatched ? (
                <Button
                  nativeButton={false}
                  size="tap"
                  tone="brand"
                  className="h-12 w-full font-bold"
                  render={<Link href={`/chat/${uuid}`} prefetch={false} />}
                >
                  <MessageCircle className="size-4" />
                  Message
                </Button>
              ) : (
                <Button
                  size="tap"
                  tone="brand"
                  className="h-12 w-full font-bold"
                  disabled
                  aria-disabled="true"
                  title="Match required to send a message"
                >
                  <MessageCircle className="size-4" />
                  Message
                </Button>
              )}
              <Button
                size="tap"
                variant="outline"
                className="h-10 w-full"
                disabled={!profileLoaded}
                onClick={async () => {
                  try {
                    await decide(uuid, "nope");
                  } catch {
                    // surfaced via useDecisions().error
                  }
                  router.push(backHref);
                }}
              >
                <X className="size-3.5" />
                Pass
              </Button>
            </div>
          </div>

          {/* Scrollable body — bio paragraph, About/Compat 2-col, interests, footer */}
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2">
            {/* Bio paragraph */}
            {profile.bio && (
              <p className="m-0 text-base leading-relaxed text-(--ink) [text-wrap:pretty]">
                {profile.bio}
              </p>
            )}

            {/* About + Compatibility — stack vertically on narrow desktops
                (the right column gets squeezed once image col + actions
                eat the laptop-width viewport); side-by-side at 2xl+. */}
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 border-t border-(--hairline) pt-6">
              <Card tone="elevated" className="bg-card p-5 rounded-2xl gap-3">
                <div className="text-overline text-(--ink-2)">
                  About
                </div>
                <dl className="m-0 flex flex-col gap-2.5">
                  {profile.sex && (
                    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                      <dt className="text-meta text-(--ink-2)">
                        Gender
                      </dt>
                      <dd className="m-0 text-meta font-medium text-(--ink)">
                        {profile.sex === "female" ? "Woman" : "Man"}
                      </dd>
                    </div>
                  )}
                  {profile.occupation && (
                    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                      <dt className="text-meta text-(--ink-2)">
                        Work
                      </dt>
                      <dd className="m-0 text-meta font-medium text-(--ink)">
                        {profile.occupation}
                      </dd>
                    </div>
                  )}
                  {profile.education && (
                    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                      <dt className="text-meta text-(--ink-2)">
                        Education
                      </dt>
                      <dd className="m-0 text-meta font-medium text-(--ink)">
                        {labelOf(profile.education, EDUCATIONS) ??
                          profile.education}
                      </dd>
                    </div>
                  )}
                  {profile.assembly?.length ? (
                    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                      <dt className="text-meta text-(--ink-2)">
                        Identity
                      </dt>
                      <dd className="m-0 text-meta font-medium text-(--ink)">
                        {profile.assembly
                          .map((a) => labelOf(a, ASSEMBLIES) ?? a)
                          .join(", ")}
                      </dd>
                    </div>
                  ) : null}
                  {profile.children !== undefined && (
                    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                      <dt className="text-meta text-(--ink-2)">
                        Children
                      </dt>
                      <dd className="m-0 text-meta font-medium text-(--ink)">
                        {profile.children === 1
                          ? "1 child"
                          : `${profile.children} children`}
                      </dd>
                    </div>
                  )}
                  {profile.languages?.length ? (
                    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                      <dt className="text-meta text-(--ink-2)">
                        Languages
                      </dt>
                      <dd className="m-0 text-meta font-medium text-(--ink)">
                        {profile.languages
                          .map((c) => labelForLanguage(c))
                          .join(", ")}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Card>

              {/* Compatibility 6-bar breakdown — only when compat result present */}
              {compatResult ? (
                <Card
                  tone="elevated"
                  className="bg-card p-5 rounded-2xl gap-3"
                >
                  <div className="text-overline text-(--ink-2)">
                    Compatibility · {compatResult.score}%
                  </div>
                  <div className="flex flex-col gap-3">
                    {Object.entries(compatResult.breakdown)
                      .slice(0, 6)
                      .map(([key, raw]) => {
                        const v = Math.round((raw as number) * 100);
                        const fillColor =
                          v >= 85
                            ? "var(--color-lime)"
                            : v >= 65
                              ? "var(--color-lavender)"
                              : "var(--color-pink)";
                        return (
                          <div key={key}>
                            <div className="flex justify-between">
                              <div className="text-meta capitalize text-(--ink)">
                                {key}
                              </div>
                              <div className="text-meta tabular-nums text-(--ink-2)">
                                {v}%
                              </div>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--hairline)]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  // eslint-disable-next-line no-restricted-syntax -- dynamic percentage width from data; no token equivalent
                                  width: `${v}%`,
                                  background: fillColor,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              ) : (
                <Card
                  tone="elevated"
                  className="bg-card p-5 rounded-2xl gap-2"
                >
                  <div className="text-overline text-(--ink-2)">
                    Compatibility
                  </div>
                  <p className="text-meta text-(--ink-2)">
                    Not enough signal yet.
                  </p>
                </Card>
              )}
            </div>

            {/* Interests pills */}
            {profile.interests?.length ? (
              <div className="border-t border-(--hairline) pt-6">
                <div className="mb-2.5 text-overline text-(--ink-2)">
                  Interests
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <Pill
                      key={interest}
                      variant="outline"
                      className="bg-card border-(--hairline) text-(--ink) font-medium px-3.5 py-1.5"
                    >
                      {labelOf(interest, INTERESTS) ?? interest}
                    </Pill>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Footer — Report or block + meta */}
            <div className="mt-auto flex items-center justify-between border-t border-(--hairline) pt-4">
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-2 text-sm text-(--ink-3) hover:text-(--ink)"
              >
                <AlertTriangle className="size-3.5" />
                Report or block
              </button>
              </div>
          </div>
        </motion.div>
      </div>

      <TokenSpendSheet
        open={superSheetOpen}
        onOpenChange={setSuperSheetOpen}
        title={`Super-like ${profile.firstName ?? "this person"}?`}
        description="They'll see your like at the top of their deck with a lime ring."
        cost={2}
        currentBalance={tokenBalanceForSheet}
        onConfirm={handleSuperLike}
        busy={superBusy}
      />

      <BlockReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        subjectName={profile.firstName ?? "this person"}
        onSubmit={async (payload) => {
          const reason = payload.details
            ? `${payload.category}: ${payload.details}`
            : payload.category;
          await apiClient.post(`/skip/by-uuid/${uuid}`, { report_reason: reason });
          router.push("/discover");
        }}
      />
    </PageShell>
  );
}
