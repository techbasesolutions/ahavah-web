"use client";

import Link from "next/link";
import { use } from "react";
import { motion } from "motion/react";
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
      {/* Photo header — fixed `aspect-4/5` (matches /matches grid card aspect)
          so it doesn't absorb extra space via flex-1. With a fixed photo
          height, the bio card below has its natural content height, total
          page can exceed viewport, and PageShell's min-h-full lets the
          shell grow → scroll works. Uses PhotoTile primitive with
          `radius="none"` for full-bleed (the overlap-card curves over the
          bottom — no rounded corners on the photo itself). Back + More
          are overlay-tone circles top corners; photo paginator dots are
          top-center (Stories-style). Photo fades in on mount as the visual
          establishing shot. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <PhotoTile
          aspect="4/5"
          radius="none"
          surface="none"
          bg="linear-gradient(135deg, #c99fc9 0%, #f0a0e4 100%)"
          className="w-full"
        >
          <div className="absolute top-3 right-3 left-3 z-10 flex items-center justify-between">
            <Link
              href="/discover"
              prefetch={false}
              aria-label="Back"
              className={cn(buttonVariants({ size: "circle", tone: "overlay" }))}
            >
              <ChevronLeft className="text-white" />
            </Link>
            <Button size="circle" tone="overlay" aria-label="More">
              <MoreHorizontal className="text-white" />
            </Button>
          </div>

          <ProgressDots
            count={1}
            active={0}
            size="sm"
            tone="white"
            className="absolute top-3 left-1/2 z-10 -translate-x-1/2"
          />
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
          className="relative z-20 -mt-8 gap-4 rounded-t-3xl px-5 pt-6 pb-6"
        >
          <CardContent className="flex flex-col gap-4 px-0">
            {/* Header: name, age, location */}
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

            {/* Faith cluster — dl/dt/dd fact rows */}
            {(profile.assembly || profile.torahLevel || profile.shabbat || profile.calendar) && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h3 className="text-meta font-semibold uppercase text-text-secondary">
                  Faith
                </h3>
                <dl className="space-y-2">
                  {profile.assembly && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Assembly:</dt>
                      <dd className="text-meta text-white">
                        {labelOf(profile.assembly, ASSEMBLIES)}
                      </dd>
                    </div>
                  )}
                  {profile.torahLevel && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Torah level:</dt>
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

            {/* Doctrine cluster — fact rows */}
            {(profile.intent || profile.polygyny || profile.headCovering || profile.tzitzit) && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h3 className="text-meta font-semibold uppercase text-text-secondary">
                  Doctrine
                </h3>
                <dl className="space-y-2">
                  {profile.intent && (
                    <div className="flex gap-2">
                      <dt className="text-meta text-text-secondary">Intent:</dt>
                      <dd className="text-meta text-white">
                        {profile.intent}
                      </dd>
                    </div>
                  )}
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
                <h3 className="text-meta font-semibold uppercase text-text-secondary">
                  Lifestyle
                </h3>
                {profile.familyViews?.length && (
                  <div className="flex flex-wrap gap-2">
                    {profile.familyViews.map((view) => (
                      <Pill key={view} variant="lavender" className="text-xs font-medium">
                        {labelOf(view, FAMILY_VIEWS)}
                      </Pill>
                    ))}
                  </div>
                )}
                {profile.livingPreferences?.length && (
                  <div className="flex flex-wrap gap-2">
                    {profile.livingPreferences.map((pref) => (
                      <Pill key={pref} variant="lavender" className="text-xs font-medium">
                        {labelOf(pref, LIVING_PREFERENCES)}
                      </Pill>
                    ))}
                  </div>
                )}
                {profile.healthTags?.length && (
                  <div className="flex flex-wrap gap-2">
                    {profile.healthTags.map((tag) => (
                      <Pill key={tag} variant="lavender" className="text-xs font-medium">
                        {labelOf(tag, HEALTH_TAGS)}
                      </Pill>
                    ))}
                  </div>
                )}
                {profile.relocation && (
                  <div className="flex flex-wrap gap-2">
                    <Pill variant="lavender" className="text-xs font-medium">
                      {profile.relocation}
                    </Pill>
                  </div>
                )}
              </div>
            )}

            {/* Interests cluster — Pill rows (lime) */}
            {profile.interests?.length && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h3 className="text-meta font-semibold uppercase text-text-secondary">
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <Pill key={interest} variant="lime" className="text-xs font-medium">
                      {labelOf(interest, INTERESTS)}
                    </Pill>
                  ))}
                </div>
              </div>
            )}

            {/* Personality cluster — Pill rows (lavender) */}
            {profile.personalityTraits?.length && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h3 className="text-meta font-semibold uppercase text-text-secondary">
                  Personality
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.personalityTraits.map((trait) => (
                    <Pill key={trait} variant="lavender" className="text-xs font-medium">
                      {labelOf(trait, PERSONALITY_TRAITS)}
                    </Pill>
                  ))}
                </div>
              </div>
            )}

            {/* Verification cluster — Pill rows (lime) with ShieldCheck icon */}
            {profile.verificationTags?.length && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <h3 className="flex items-center gap-1.5 text-meta font-semibold uppercase text-text-secondary">
                  <ShieldCheck className="size-4" /> Verified
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.verificationTags.map((tag) => (
                    <Pill key={tag} variant="lime" className="text-xs font-medium">
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
              <Button size="circle" tone="brand" lift="float" aria-label="Pass">
                <X className="text-black" />
              </Button>
              <Button size="circle-lg" tone="action" lift="float" aria-label="Like">
                <Heart className="text-white" fill="currentColor" />
              </Button>
              <Button size="circle" tone="brand" lift="float" aria-label="Message">
                <MessageCircle className="text-black" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  );
}
