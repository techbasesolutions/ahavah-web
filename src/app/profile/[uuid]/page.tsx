"use client";

import Link from "next/link";
import { use } from "react";
import { motion } from "motion/react";
import {
  Check,
  ChevronLeft,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { Pill } from "@/components/kibo-ui/pill";

import { cn } from "@/lib/utils";

import { PageShell } from "@/components/app/page-shell";
import { PhotoTile } from "@/components/app/photo-tile";
import { ProgressDots } from "@/components/app/progress-dots";

type Props = { params: Promise<{ uuid: string }> };

const FAKE = {
  name: "Theresa Webb",
  age: 21,
  distance: "2.5 km away",
  compat: 92,
  bio: "I am an active and ambitious person. I love to sing and play guitar. If you love spending time in nature and you are creative too, swipe right.",
  interests: ["Extravert", "Music", "Capricorn"],
  badges: ["Bronze verified"],
  bg: "linear-gradient(160deg,#FFB088 0%,#FF7A53 60%,#3D1A45 100%)",
  photoCount: 4,
  photoIndex: 0,
};

export default function ProfileDetailPage({ params }: Props) {
  use(params);

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
          top-center (Stories-style); compat Pill sits bottom-left over the
          photo, just above where the bio card overlaps. Photo fades in on
          mount as the visual establishing shot. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <PhotoTile
          aspect="4/5"
          radius="none"
          surface="none"
          bg={FAKE.bg}
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
            count={FAKE.photoCount}
            active={FAKE.photoIndex}
            size="sm"
            tone="white"
            className="absolute top-3 left-1/2 z-10 -translate-x-1/2"
          />

          {/* Pill bottom-12 (48px from photo bottom) clears the card's
              -mt-8 (32px) overlap so the pill stays fully visible above the
              bio card. */}
          <Pill
            variant="lime"
            className="absolute bottom-12 left-5 z-10 font-bold tabular-nums"
          >
            <MessageCircle className="size-3" />
            {FAKE.compat}%
          </Pill>
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
            <div>
              <h1 className="text-h1 text-white">
                {FAKE.name}, {FAKE.age}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-meta text-text-secondary">
                <MapPin className="size-3" /> {FAKE.distance}
              </p>
            </div>

            {/* Interest pills — all lime per Dateasy reference (not the
                alternating lime/lavenderOutline pattern that was here before). */}
            <div className="flex flex-wrap gap-2">
              {FAKE.interests.map((interest) => (
                <Pill key={interest} variant="lime" className="font-medium">
                  {interest}
                </Pill>
              ))}
            </div>

            <p className="text-body leading-relaxed text-white/85">{FAKE.bio}</p>

            {/* Verified badge row — IconBadge (kit) + label, replacing the
                prior Avatar+text-fallback freestyle. */}
            <div className="flex items-center gap-2">
              <IconBadge tone="success" shape="circle" size="xs">
                <Check />
              </IconBadge>
              {FAKE.badges.map((b) => (
                <span key={b} className="text-meta font-medium text-text-secondary">
                  {b}
                </span>
              ))}
            </div>

            {/* Action row — X (skip) + Heart (like, primary, larger) + Message
                (chat). Per Dateasy reference: side buttons lavender brand,
                center heart pink action + larger. All circular with float
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
