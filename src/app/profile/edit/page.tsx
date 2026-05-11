"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Plus, X } from "lucide-react";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { PhotoTile } from "@/components/app/photo-tile";

import { useProfile } from "@/lib/use-profile";
import { computeCompleteness } from "@/lib/profile-completeness";

import IdentitySection from "@/components/profile-edit/section-identity";
import FaithSection from "@/components/profile-edit/section-faith";
import DoctrineSection from "@/components/profile-edit/section-doctrine";
import LifestyleSection from "@/components/profile-edit/section-lifestyle";
import InterestsSection from "@/components/profile-edit/section-interests";
import PracticalSection from "@/components/profile-edit/section-practical";
import VerificationSection from "@/components/profile-edit/section-verification";

// Photo placeholders — `profile.photos` doesn't exist on the schema yet.
// Kept as ephemeral local state so the existing photo grid renders during
// Sub-plan 3; real photo persistence is its own future task.
const PHOTO_GRADIENTS: ReadonlyArray<string> = [
  "linear-gradient(135deg,#FFB088,#FF7A53)",
  "linear-gradient(135deg,#9F76EA,#3A1F4F)",
  "linear-gradient(135deg,#F9D976,#A87E1E)",
  "linear-gradient(135deg,#6CB7FF,#1A1340)",
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function EditProfilePage() {
  const { profile } = useProfile();
  const completeness = computeCompleteness(profile);

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

  const requiredMissing = completeness.requiredTotal - completeness.requiredFilled;

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

      <div className="flex flex-col gap-8 px-5 pt-4">
        {/* Completeness summary — soft-completeness gate signal at the top.
            requiredMissing > 0 highlights in pink so the missing-required
            state reads urgently without nagging. */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4 }}
        >
          <Card tone="elevated" className="flex flex-col gap-2 rounded-2xl px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-h3 text-white tabular-nums">
                {completeness.percent}% complete
              </span>
              <span
                className={
                  requiredMissing > 0
                    ? "text-meta text-pink"
                    : "text-meta text-lime"
                }
              >
                {requiredMissing > 0
                  ? `${requiredMissing} required missing`
                  : "All required filled"}
              </span>
            </div>
            <ProgressPrimitive.Root
              value={completeness.percent}
              aria-label="Profile completeness"
              className="w-full"
            >
              <ProgressPrimitive.Track className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <ProgressPrimitive.Indicator className="h-full rounded-full bg-lime transition-all" />
              </ProgressPrimitive.Track>
            </ProgressPrimitive.Root>
          </Card>
        </motion.div>

        {/* Photos — 3 col, 6 slots. Not yet schema-backed. */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col gap-3"
        >
          <h2 className="text-h3 text-white">Photos</h2>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, i) =>
              photo ? (
                <PhotoTile key={i} bg={photo}>
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

        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
          <IdentitySection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.15 }}>
          <FaithSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }}>
          <DoctrineSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.25 }}>
          <LifestyleSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }}>
          <InterestsSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.35 }}>
          <PracticalSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.4 }}>
          <VerificationSection />
        </motion.div>

        {/* Done button — useProfile autosaves every change, so this is just
            a "I'm finished" affordance that routes back to /profile. */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="flex flex-col gap-1"
        >
          <Button
            size="cta"
            tone="cta"
            className="w-full"
            nativeButton={false}
            render={<Link href="/profile" prefetch={false} />}
          >
            Done
          </Button>
          <p className="text-center text-caption text-text-muted">
            Changes save automatically as you edit.
          </p>
        </motion.div>
      </div>

      <BottomNav />
    </PageShell>
  );
}
