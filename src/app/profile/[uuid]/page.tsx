"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
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
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";
import { gradientsFor } from "@/lib/profile-gradients";

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
  PERSONALITY_TRAITS,
  VERIFICATION_TAGS,
  RELOCATIONS,
  intentOptionsForSex,
} from "@/lib/profile-schema";
import { sampleByName } from "@/lib/profile-sample";

type Props = { params: Promise<{ uuid: string }> };

function labelOf<T extends string>(
  value: T,
  options: ReadonlyArray<{ value: T; label: string }>
): string | undefined {
  return options.find((opt) => opt.value === value)?.label;
}

export default function ProfileDetailPage({ params }: Props) {
  const { uuid } = use(params);
  const profile = sampleByName(uuid);
  const { profile: userProfile } = useProfile();

  // Deterministic 3-photo gradient stamp keyed off the uuid. Same uuid →
  // same gradients across reloads. Replaced once Sub-plan 9 (real photos)
  // lands; the carousel + ProgressDots wiring stays.
  const photos = useMemo(() => gradientsFor(uuid), [uuid]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const nextPhoto = () =>
    setPhotoIndex((i) => (i + 1) % photos.length);
  const prevPhoto = () =>
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);

  // BlockReportSheet wiring for the kebab — same pattern as /chat.
  const [reportOpen, setReportOpen] = useState(false);

  // Compute compatibility between viewer and sample profile
  const compatResult = userProfile && profile
    ? computeCompatibility(userProfile, profile)
    : null;

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
          {/* Animated gradient layer — crossfade on photoIndex change. */}
          <AnimatePresence initial={false}>
            <motion.div
              key={photoIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
              style={{ background: photos[photoIndex] }}
            />
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

          {/* Top chrome — back / more */}
          <div className="absolute top-3 right-3 left-3 z-10 flex items-center justify-between">
            <Link
              href="/discover"
              prefetch={false}
              aria-label="Back"
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
            count={photos.length}
            active={photoIndex}
            size="sm"
            tone="white"
            className="absolute top-3 left-1/2 z-10 -translate-x-1/2"
          />

          {/* Compat chip — anchors the carousel bottom-right instead of
              competing with the name inside the bio card. */}
          {compatResult && (
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
            </div>

            {/* Bio paragraph (conditional) */}
            {profile.bio && (
              <p className="text-body leading-relaxed text-white/85">{profile.bio}</p>
            )}

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
                      {profile.sex
                        ? labelOf(profile.intent, intentOptionsForSex(profile.sex))
                        : profile.intent}
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
              transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
              className="mt-2 flex items-center justify-center gap-5"
            >
              {/* TODO(decision-engine): Pass + Like need real handlers.
                  Pass: mark candidate as skipped (persist), navigate /discover.
                  Like: send like, check mutual, navigate /match (mutual)
                  or /discover (one-way). Message is wired below. Spec these
                  alongside the discover swipe-deck decision persistence. */}
              <Button size="circle" tone="brand" lift="float" aria-label="Pass">
                <X className="text-black" />
              </Button>
              <Button size="circle-lg" tone="action" lift="float" aria-label="Like">
                <Heart className="text-white" fill="currentColor" />
              </Button>
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
        onSubmit={(payload) => {
          console.log("REPORT", profile.firstName, payload);
        }}
      />
    </PageShell>
  );
}
