"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import { useProfile } from "@/lib/use-profile";
import { computeCompleteness } from "@/lib/profile-completeness";

import { PhotoEditSection } from "@/components/profile-edit/section-photos";
import IdentitySection from "@/components/profile-edit/section-identity";
import FaithSection from "@/components/profile-edit/section-faith";
import DoctrineSection from "@/components/profile-edit/section-doctrine";
import LifestyleSection from "@/components/profile-edit/section-lifestyle";
import InterestsSection from "@/components/profile-edit/section-interests";
import PracticalSection from "@/components/profile-edit/section-practical";
import VerificationSection from "@/components/profile-edit/section-verification";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function EditProfilePage() {
  const { profile } = useProfile();
  const completeness = computeCompleteness(profile);

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
          transition={{ duration: 0.25 }}
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

        {/* Photos — real upload pipeline (SP21 T7). Mounted first because
            photos are the headline of any profile. Uses PhotoEditSection
            which wraps the same compressImage + canAddPhoto + PhotoSlot
            stack as /onboarding/photos, but in a ProfileSection shell. */}
        <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.04 }}>
          <PhotoEditSection />
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.08 }}>
          <IdentitySection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.12 }}>
          <FaithSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.16 }}>
          <DoctrineSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.16 }}>
          <LifestyleSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.16 }}>
          <InterestsSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.16 }}>
          <PracticalSection />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.16 }}>
          <VerificationSection />
        </motion.div>

        {/* Done button — useProfile autosaves every change, so this is just
            a "I'm finished" affordance that routes back to /profile. */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.2 }}
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
