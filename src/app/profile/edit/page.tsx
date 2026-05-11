"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ChevronRight, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Heart, Languages, Sparkles, Users } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { PhotoTile } from "@/components/app/photo-tile";

const PHOTO_GRADIENTS: ReadonlyArray<string> = [
  "linear-gradient(135deg,#FFB088,#FF7A53)",
  "linear-gradient(135deg,#9F76EA,#3A1F4F)",
  "linear-gradient(135deg,#F9D976,#A87E1E)",
  "linear-gradient(135deg,#6CB7FF,#1A1340)",
];

const ABOUT_LINKS: ReadonlyArray<{
  Icon: typeof Heart;
  title: string;
  value: string;
  href: string;
}> = [
  { Icon: Heart,     title: "Looking for",       value: "Relationship",        href: "/onboarding/bio" },
  { Icon: Users,     title: "Show me",           value: "Women",               href: "/onboarding/gender" },
  { Icon: Globe,     title: "Country",           value: "Barbados",            href: "/onboarding/country" },
  { Icon: Languages, title: "Languages I speak", value: "English, Spanish",    href: "/onboarding/country" },
  { Icon: Sparkles,  title: "Personality",       value: "Adventurous, curious",href: "/onboarding/bio" },
];

const MAX_BIO = 500;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function EditProfilePage() {
  const [name, setName] = useState("Ehud");
  const [bio, setBio] = useState(
    "Cycling, board games, and finding the best espresso bar wherever I land.",
  );
  const [photos, setPhotos] = useState<(string | null)[]>([
    PHOTO_GRADIENTS[0],
    PHOTO_GRADIENTS[1],
    null,
    null,
    null,
    null,
  ]);

  const removePhoto = (i: number) =>
    setPhotos((prev) => prev.map((p, idx) => (idx === i ? null : p)));
  const addPhoto = (i: number) => {
    const next = PHOTO_GRADIENTS[i % PHOTO_GRADIENTS.length];
    setPhotos((prev) => prev.map((p, idx) => (idx === i ? next : p)));
  };

  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to profile"
          render={<Link href="/profile" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Edit profile</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-5 pt-4">
        {/* Photos — 3 col, 6 slots */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col gap-3"
        >
          <h2 className="text-overline text-text-muted">Photos</h2>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, i) =>
              photo ? (
                <PhotoTile key={i} bg={photo}>
                  {/* 44px touch target (size="circle" = size-tap-lg) per
                      mobile-responsive rule 1. Inset top-3 right-3 (12px)
                      clears the rounded-2xl corner curve and matches the
                      project's Pill inset norm from /profile/[uuid]. */}
                  <Button
                    size="circle"
                    tone="overlay"
                    className="absolute right-3 top-3"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => removePhoto(i)}
                  >
                    <X className="size-5" />
                  </Button>
                </PhotoTile>
              ) : (
                <Button
                  key={i}
                  variant="ghost"
                  size="dashedTile"
                  aria-label={`Add photo ${i + 1}`}
                  onClick={() => addPhoto(i)}
                >
                  <Plus />
                </Button>
              ),
            )}
          </div>
          <p className="text-caption text-text-muted">
            Tap a slot to add a photo. Drag to reorder (coming soon).
          </p>
        </motion.section>

        {/* Basics */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.13 }}
          className="flex flex-col gap-3"
        >
          <h2 className="text-overline text-text-muted">Basics</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-meta text-white">
              First name
            </Label>
            <Input
              id="name"
              size="lg"
              tone="elevated"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bio" className="text-meta text-white">
              Bio
            </Label>
            <Textarea
              id="bio"
              size="lg"
              tone="elevated"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              placeholder="A short bio helps people start a conversation."
              aria-describedby="bio-counter"
              className="min-h-32 resize-none"
            />
            {/* aria-live announces the count to SRs as the user types —
                mirrors /onboarding/bio. tabular-nums keeps the digits from
                shifting the row width as length grows. */}
            <p
              id="bio-counter"
              aria-live="polite"
              className="text-right text-caption tabular-nums text-text-muted"
            >
              {bio.length}/{MAX_BIO}
            </p>
          </div>
        </motion.section>

        {/* About */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.21 }}
          className="flex flex-col gap-3"
        >
          <h2 className="text-overline text-text-muted">About</h2>
          <ItemGroup className="gap-1">
            {ABOUT_LINKS.map((link) => (
              <Item
                key={link.title}
                variant="muted"
                render={
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="rounded-2xl"
                  />
                }
              >
                <ItemMedia>
                  <IconBadge tone="brand">
                    <link.Icon />
                  </IconBadge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta text-white">
                    {link.title}
                  </ItemTitle>
                  <ItemDescription className="text-caption text-text-muted">
                    {link.value}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4 text-text-muted" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </motion.section>

        {/* Save CTA */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.29 }}
        >
          <Button size="cta" tone="cta" className="mt-2 w-full">
            Save changes
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </PageShell>
  );
}
