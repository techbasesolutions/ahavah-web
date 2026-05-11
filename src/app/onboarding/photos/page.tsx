"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/kibo-ui/pill";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { PhotoTile } from "@/components/app/photo-tile";

const SLOTS = 6;

// Placeholder gradients — cycle these on tap so the audit can demonstrate
// the filled-state UI. Real implementation will hand off to a file picker
// + camera capture + upload flow.
const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg,#FFB088,#FF7A53)",
  "linear-gradient(135deg,#9F76EA,#3A1F4F)",
  "linear-gradient(135deg,#F9D976,#A87E1E)",
  "linear-gradient(135deg,#6CB7FF,#1A1340)",
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function PhotosStep() {
  const [photos, setPhotos] = useState<(string | null)[]>(() =>
    Array.from({ length: SLOTS }, () => null),
  );

  const filledCount = photos.filter(Boolean).length;
  const hasMain = photos[0] != null;

  const addPhoto = (i: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      // Stub — cycle through placeholders by current filled count so each
      // upload looks distinct. Real flow will receive a File + URL.createObjectURL.
      next[i] = PLACEHOLDER_GRADIENTS[
        next.filter(Boolean).length % PLACEHOLDER_GRADIENTS.length
      ];
      return next;
    });
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.map((p, idx) => (idx === i ? null : p)));
  };

  return (
    <OnboardingShell
      step={7}
      totalSteps={10}
      back="/onboarding/looking-for"
      next="/onboarding/country"
      ctaDisabled={!hasMain}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Add a few photos<span className="text-lime">.</span>
        </h1>
        <p className="text-body text-text-secondary">
          Your first photo is what people see in the deck.
        </p>
      </motion.div>

      {/* 3-column grid of 3:4 photo slots. Slot 0 carries a "Main" pill so
          the deck-photo rule is communicated spatially, not just in copy. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-8 grid grid-cols-3 gap-3"
      >
        {photos.map((photo, i) => (
          <motion.div
            key={i}
            {...fadeUp}
            transition={{ duration: 0.35, delay: 0.2 + i * 0.04 }}
            className="relative"
          >
            {photo ? (
              <PhotoTile bg={photo}>
                {/* "Main" pill at bottom-3 left-3 keeps it from colliding
                    with the X remove control in the top-right and matches
                    the project's `Pill bottom-12 left-5` photo-overlay
                    norm from /profile/[uuid]. */}
                {i === 0 && (
                  <Pill
                    variant="lime"
                    className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1 text-caption font-semibold shadow-sm"
                  >
                    Main
                  </Pill>
                )}
                {/* 44px touch target per mobile-responsive rule 1.
                    Inset top-3 right-3 (12px) clears the rounded-2xl corner
                    curve (~16px radius). */}
                <Button
                  size="circle"
                  tone="overlay"
                  className="absolute top-3 right-3 transition-transform active:scale-95"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => removePhoto(i)}
                >
                  <X className="size-5" />
                </Button>
              </PhotoTile>
            ) : (
              <Button
                variant="ghost"
                size="dashedTile"
                className="relative transition-transform active:scale-[0.97]"
                aria-label={`Add photo ${i + 1}`}
                onClick={() => addPhoto(i)}
              >
                {i === 0 && (
                  <Pill
                    variant="lime"
                    className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1 text-caption font-semibold shadow-sm"
                  >
                    Main
                  </Pill>
                )}
                <Plus />
              </Button>
            )}
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.45 }}
        className={
          hasMain
            ? "mt-6 text-center text-caption text-lime"
            : "mt-6 text-center text-caption text-text-muted"
        }
        aria-live="polite"
      >
        {hasMain
          ? `${filledCount} ${filledCount === 1 ? "photo" : "photos"} added — your main photo is set.`
          : "At least one photo required."}
      </motion.p>
    </OnboardingShell>
  );
}
