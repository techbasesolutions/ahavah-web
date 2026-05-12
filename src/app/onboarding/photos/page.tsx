"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { PhotoSlot } from "@/components/app/photo-slot";
import { compressImage } from "@/lib/image-compress";
import { canAddPhoto } from "@/lib/photo-storage";
import { useProfile } from "@/lib/use-profile";

const SLOT_COUNT = 6;

type SlotState = "empty" | "loading" | "filled" | "error";

export default function PhotosStep() {
  const { profile, update } = useProfile();
  const photos = profile.photos ?? [];
  // Per-slot transient state (loading / error). Indexed 0..5.
  // Filled state is derived from photos[i] directly so it survives reload;
  // only loading/error are session-local.
  const [slotStates, setSlotStates] = useState<
    Record<number, { state: SlotState; error?: string }>
  >({});

  const hasMain = (photos[0] ?? "") !== "";
  const isComplete = hasMain;

  const handlePick = async (slotIndex: number, file: File) => {
    setSlotStates((s) => ({ ...s, [slotIndex]: { state: "loading" } }));
    try {
      const compressed = await compressImage(file);
      // Exclude this slot from the quota baseline so a re-upload doesn't
      // double-count the photo we're about to overwrite.
      const baseline = photos.filter((_, i) => i !== slotIndex);
      const quota = canAddPhoto(baseline, compressed.bytes);
      if (!quota.ok) {
        setSlotStates((s) => ({
          ...s,
          [slotIndex]: { state: "error", error: quota.reason },
        }));
        return;
      }
      const nextPhotos = [...photos];
      nextPhotos[slotIndex] = compressed.dataUrl;
      // Compact: filter empty entries so the main slot is always populated
      // first. If the user fills slot 2 before slots 0+1, the photo moves
      // into slot 0 on save. This matches the "first non-empty is main"
      // invariant the consumer surfaces (T8) expect.
      const compacted = nextPhotos.filter((p) => p && p.length > 0);
      update({ photos: compacted });
      setSlotStates((s) => {
        const copy = { ...s };
        delete copy[slotIndex];
        return copy;
      });
    } catch (err) {
      setSlotStates((s) => ({
        ...s,
        [slotIndex]: {
          state: "error",
          error:
            err instanceof Error ? err.message : "Couldn't read this file.",
        },
      }));
    }
  };

  const handleRemove = (slotIndex: number) => {
    const next = [...photos];
    next.splice(slotIndex, 1);
    update({ photos: next });
    setSlotStates((s) => {
      const copy = { ...s };
      delete copy[slotIndex];
      return copy;
    });
  };

  return (
    <OnboardingShell href="/onboarding/photos" ctaDisabled={!isComplete}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Add your photos<span className="text-lime">.</span>
        </h1>
        <p className="text-body text-text-secondary">
          Pick at least one photo. Your first photo is your main, it shows up on Discover and Map.
        </p>
      </motion.div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {Array.from({ length: SLOT_COUNT }).map((_, i) => {
          const photo = photos[i];
          const localState = slotStates[i];
          const state: SlotState = localState?.state ?? (photo ? "filled" : "empty");
          return (
            <PhotoSlot
              key={i}
              index={i}
              isMain={i === 0}
              state={state}
              src={photo}
              errorMessage={localState?.error}
              onPick={(file) => handlePick(i, file)}
              onRemove={photo ? () => handleRemove(i) : undefined}
            />
          );
        })}
      </div>

      <p className="mt-4 text-caption text-text-secondary" aria-live="polite">
        {hasMain
          ? `${photos.length} of ${SLOT_COUNT} added. Your main photo is set.`
          : "At least one photo required."}
      </p>
      <p className="mt-1 text-caption text-text-muted">
        JPEG, PNG, or WebP up to 10MB each. Photos are compressed before saving.
      </p>
    </OnboardingShell>
  );
}
