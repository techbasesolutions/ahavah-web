"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronLeft,
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
import { PhotoTile } from "@/components/app/photo-tile";
import { ProgressDots } from "@/components/app/progress-dots";
import { CompatPill } from "@/components/app/compat-pill";
import { BlockReportSheet } from "@/components/app/block-report-sheet";
import { useProfile } from "@/lib/use-profile";
import { useDecisions } from "@/lib/use-decisions";
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";
import { photoOrGradient } from "@/lib/photo-or-gradient";
import { cdnUrlFor } from "@/lib/photo-storage";

import {
  ASSEMBLIES,
  TORAH_LEVELS,
  SHABBATS,
  CALENDARS,
  POLYGYNY_VIEWS,
  HEAD_COVERINGS,
  TZITZIT_OPTIONS,
  FAMILY_VIEWS,
  LIVING_PREFERENCES,
  HEALTH_TAGS,
  INTERESTS,
  EDUCATIONS,
  MARITAL_STATUSES,
  NATIONALITIES,
  PERSONALITY_TRAITS,
  VERIFICATION_TAGS,
  RELOCATIONS,
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
    // Pass-through looking_for raw value — the page's labelOf returns
    // undefined for the backend's strings ("Long-term dating",
    // "Marriage") which aren't in the Torah-observant Intent enum, but
    // the rendering falls back to the raw value when labelOf misses.
    intent: typeof raw.looking_for === "string"
      ? (raw.looking_for as Profile["intent"])
      : undefined,
    // Spread Torah-observant fields LAST so they overwrite the
    // narrower mappings above (e.g. ahavah_extra.healthTags from
    // onboarding should win over the smoking/drinking-derived list).
    ...extras,
  } as Profile & { country?: string };
}

type Props = { params: Promise<{ uuid: string }> };

function labelOf<T extends string>(
  value: T,
  options: ReadonlyArray<{ value: T; label: string }>
): string | undefined {
  return options.find((opt) => opt.value === value)?.label;
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

  // Back-button target — when the viewer arrived from /map (MapAvatar
  // appends ?from=map on marker tap), we return to /map instead of the
  // /discover default. User feedback (2026-05-12):
  // "the back button on profiles when clicked from the map should go
  //  back to the map".
  const fromMap = searchParams.get("from") === "map";
  const backHref = fromMap ? "/map" : "/discover";
  const backLabel = fromMap ? "Back to map" : "Back to discover";

  // Photo carousel — slot count is the actual photos length (clamped
  // 1..3 so the page never collapses to zero AND a power-user with 7
  // photos still gets a reasonably-sized timeline). When a slot is
  // empty for a thin profile, photoOrGradient returns the deterministic
  // gradient seeded on the prospect uuid for stability across reloads.
  const photoSlots = Math.max(1, Math.min(profile?.photos?.length ?? 1, 3));
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
          <p className="text-body text-text-secondary" aria-live="polite">
            Loading profile…
          </p>
        </div>
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell bottomPad="none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card
            tone="overlap"
            className="relative z-20 rounded-2xl px-5 py-8 text-center"
          >
            <CardContent className="flex flex-col gap-4 px-0">
              <h2 className="text-h2 text-white">Profile not found</h2>
              <p className="text-body text-text-secondary">
                The profile you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <Link
                href="/discover"
                className={cn(buttonVariants({ tone: "action" }))}
              >
                Back to discover
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell bottomPad="none">
      {/* Photo carousel — `aspect-4/5` (matches /matches grid). The photo
          region is a seeded 3-gradient stamp (gradientsFor(uuid)) until
          Sub-plan 9 ships real photo upload. AnimatePresence crossfades
          between gradients on tap. Left half / right half of the photo
          are invisible prev/next tap zones, paginator dots stay top-center
          (Stories-style), Back + More + (NEW) Compat chip sit overlaid. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <PhotoTile
          aspect="4/5"
          radius="none"
          surface="none"
          bg="transparent"
          className="w-full"
        >
          {/* Animated photo layer — crossfade on photoIndex change.
              SP21 T8: real photo via <img> when present, gradient
              fallback otherwise. */}
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

          {/* Tap zones — left half = prev, right half = next. Sit behind
              the controls (z-0) so back / more / dots still receive taps. */}
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

          {/* Top chrome — back / more. Back href + label read from
              ?from=map to send map visitors back to /map. */}
          <div className="absolute top-3 right-3 left-3 z-10 flex items-center justify-between">
            <Link
              href={backHref}
              prefetch={false}
              aria-label={backLabel}
              className={cn(buttonVariants({ size: "circle", tone: "overlay" }))}
            >
              <ChevronLeft className="text-white" />
            </Link>
            <Button
              size="circle"
              tone="overlay"
              aria-label="More"
              onClick={() => setReportOpen(true)}
            >
              <MoreHorizontal className="text-white" />
            </Button>
          </div>

          <ProgressDots
            count={photoSources.length}
            active={photoIndex}
            size="sm"
            tone="white"
            className="absolute top-3 left-1/2 z-10 -translate-x-1/2"
          />

          {/* Compat chip — anchors the carousel bottom-right instead of
              competing with the name inside the bio card. Only shown
              when the underlying breakdown has real signal; otherwise
              the % is essentially the no-data baseline and would
              mislead the viewer. */}
          {showCompatPill && compatResult && (
            <div className="absolute bottom-12 right-4 z-10">
              <CompatPill
                score={compatResult.score}
                breakdown={compatResult.breakdown}
                size="sm"
              />
            </div>
          )}
        </PhotoTile>
      </motion.div>

      {/* Bio card — overlaps photo bottom by 32px (-mt-8) so the
          rounded-t-3xl curves (~24px radius) sit ENTIRELY inside the photo
          region. Slides up from y:24 with fadeIn (delay 0.1s) so the
          entrance reads photo-establish → card-reveal → actions-land. */}
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
            {/* Header: name, age, location. Compat chip now anchors the
                carousel bottom-right; it no longer competes for space here. */}
            <div>
              <h1 className="text-h1 text-white">
                {profile.firstName}, {profile.age}
              </h1>
              {profile.country && (
                <p className="mt-1 flex items-center gap-1.5 text-meta text-text-secondary">
                  <MapPin className="size-3" /> {profile.country}
                </p>
              )}
              {(profile.nationality ||
                profile.maritalStatus !== undefined ||
                profile.children !== undefined) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.nationality && (
                    <Pill variant="lavender" size="sm">
                      {labelOf(profile.nationality, NATIONALITIES) ?? profile.nationality}
                    </Pill>
                  )}
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

            {/* Bio paragraph (conditional) */}
            {profile.bio && (
              <p className="text-body leading-relaxed text-white/85">{profile.bio}</p>
            )}

            {/* About me — backend fields the page didn't have a section for
                before (occupation, education, sex). Renders only when at
                least one is present so an entirely-empty user doesn't get
                an empty heading. */}
            {(profile.occupation || profile.education || profile.sex) && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="text-meta font-semibold uppercase text-text-secondary">
                  About
                </h2>
                <dl className="space-y-2">
                  {profile.sex && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Gender:</dt>
                      <dd className="text-meta text-white">
                        {profile.sex === "female" ? "Woman" : "Man"}
                      </dd>
                    </div>
                  )}
                  {profile.occupation && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Work:</dt>
                      <dd className="text-meta text-white">{profile.occupation}</dd>
                    </div>
                  )}
                  {profile.education && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Education:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.education, EDUCATIONS) ?? profile.education}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Languages cluster — Pill rows (lavender). Identity/about-me
                bucket, mirrors Lifestyle/Personality. labelForLanguage
                resolves canonical codes (en, he) and custom: entries. */}
            {profile.languages?.length ? (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="text-meta font-semibold uppercase text-text-secondary">
                  Languages
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((code) => (
                    <Pill key={code} variant="lavender" size="sm">
                      {labelForLanguage(code)}
                    </Pill>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Looking for — intent is the primary matching signal, NOT a
                doctrinal item. Sits right under the bio so it lands before
                the faith / practice clusters. Matches the editor's
                'Practical compatibility' cluster placement. */}
            {profile.intent && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="text-meta font-semibold uppercase text-text-secondary">
                  Looking for
                </h2>
                <dl className="space-y-2">
                  <div className="flex gap-2">
                    <dt className="text-meta text-text-secondary">Intent:</dt>
                    <dd className="text-meta text-white">
                      {(profile.sex
                        ? labelOf(profile.intent, intentOptionsForSex(profile.sex))
                        : null) ?? profile.intent}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Faith cluster — dl/dt/dd fact rows */}
            {(profile.assembly || profile.torahLevel || profile.shabbat || profile.calendar) && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="text-meta font-semibold uppercase text-text-secondary">
                  Faith
                </h2>
                <dl className="space-y-2">
                  {profile.assembly && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Identifies as:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.assembly, ASSEMBLIES)}
                      </dd>
                    </div>
                  )}
                  {profile.torahLevel && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Torah stage:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.torahLevel, TORAH_LEVELS)}
                      </dd>
                    </div>
                  )}
                  {profile.shabbat && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Shabbat:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.shabbat, SHABBATS)}
                      </dd>
                    </div>
                  )}
                  {profile.calendar && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Calendar:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.calendar, CALENDARS)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Doctrine cluster — Torah-keeping practice items. Intent moved
                out to a 'Looking for' cluster above the bio since it's a
                marriage-intent signal, not a doctrinal stance. */}
            {(profile.polygyny || profile.headCovering || profile.tzitzit) && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="text-meta font-semibold uppercase text-text-secondary">
                  Doctrine
                </h2>
                <dl className="space-y-2">
                  {profile.polygyny && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Polygyny:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.polygyny, POLYGYNY_VIEWS)}
                      </dd>
                    </div>
                  )}
                  {profile.headCovering && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Head covering:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.headCovering, HEAD_COVERINGS)}
                      </dd>
                    </div>
                  )}
                  {profile.tzitzit && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Tzitzit:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.tzitzit, TZITZIT_OPTIONS)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Lifestyle cluster — Pill rows (lavender) */}
            {(profile.familyViews?.length || profile.livingPreferences?.length || profile.healthTags?.length || profile.relocation) && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="text-meta font-semibold uppercase text-text-secondary">
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
                {profile.relocation && (
                  <dl className="space-y-2">
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Relocation:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.relocation, RELOCATIONS)}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            )}

            {/* Interests cluster — Pill rows (lime) */}
            {profile.interests?.length && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="text-meta font-semibold uppercase text-text-secondary">
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

            {/* Personality cluster — Pill rows (lavender) */}
            {profile.personalityTraits?.length && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="text-meta font-semibold uppercase text-text-secondary">
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

            {/* Verification cluster — Pill rows (lime) with ShieldCheck icon */}
            {profile.verificationTags?.length && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h2 className="flex items-center gap-1.5 text-meta font-semibold uppercase text-text-secondary">
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

            {/* Action row — X (skip) + Heart (like, primary, larger) + Message
                (chat). Per Dateasy reference: side buttons brand,
                center heart action + larger. All circular with float
                shadow. Fades up after the card settles. */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.2, ease: "easeOut" }}
              className="mt-2 flex items-center justify-center gap-5"
            >
              <Button
                size="circle"
                tone="brand"
                lift="float"
                aria-label="Pass"
                disabled={!profileLoaded}
                onClick={async () => {
                  // Real backend POST /decisions {nope}. Was previously
                  // recordPass(localOnly) — local-only flag with no
                  // backend write, so swipes from /profile/[uuid] never
                  // landed on the person row. AUDIT FIX 2026-05-14.
                  try {
                    await decide(uuid, "nope");
                  } catch {
                    // surfaced via useDecisions().error; navigate anyway
                  }
                  router.push(backHref);
                }}
              >
                <X className="text-black" />
              </Button>
              <Button
                size="circle-lg"
                tone="action"
                lift="float"
                aria-label="Like"
                disabled={!profileLoaded}
                onClick={async () => {
                  // Real backend POST /decisions {like}. Was previously
                  // recordLike(localOnly) + simulateLikesBack(sample) —
                  // neither hit the backend, so likes from /profile/[uuid]
                  // never created matches. AUDIT FIX 2026-05-14.
                  try {
                    const result = await decide(uuid, "like");
                    if (result.matchId) {
                      router.push(`/match?matchId=${encodeURIComponent(result.matchId)}`);
                      return;
                    }
                  } catch {
                    // surfaced via useDecisions().error; navigate anyway
                  }
                  router.push(backHref);
                }}
              >
                <Heart className="text-white" fill="currentColor" />
              </Button>
              {/* Message button: existing wiring stays — Link render to /chat/[id]. */}
              <Button
                nativeButton={false}
                size="circle"
                tone="brand"
                lift="float"
                aria-label="Message"
                render={<Link href={`/chat/${uuid}`} prefetch={false} />}
              >
                <MessageCircle className="text-black" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <BlockReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        subjectName={profile.firstName ?? "this person"}
        onSubmit={async (payload) => {
          // Concatenate category + free-text details into the report
          // reason so moderators see both. Backend sets reported=true
          // automatically when reason is non-empty.
          const reason = payload.details
            ? `${payload.category}: ${payload.details}`
            : payload.category;
          await apiClient.post(`/skip/by-uuid/${uuid}`, { report_reason: reason });
          // Block is immediate — leave the profile we just blocked.
          router.push("/discover");
        }}
      />
    </PageShell>
  );
}
