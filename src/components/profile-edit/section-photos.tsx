"use client";

import { useState } from "react";

import { ProfileSection } from "@/components/app/profile-field";
import { PhotoSlot } from "@/components/app/photo-slot";
import { compressImage } from "@/lib/image-compress";
import { canAddPhoto } from "@/lib/photo-storage";
import { useProfile } from "@/lib/use-profile";

const SLOT_COUNT = 6;

type SlotState = "empty" | "loading" | "filled" | "error";

/**
 * Photo grid for /profile/edit. Mirrors /onboarding/photos's upload
 * logic but wraps in ProfileSection rather than OnboardingShell. Uses
 * the same PhotoSlot primitive + compressImage + canAddPhoto quota
 * guard. Slot 0 is "main"; consumer surfaces (T8) read profile.photos[0].
 */
export function PhotoEditSection() {
  const { profile, update } = useProfile();
  const photos = profile.photos ?? [];
  const [slotStates, setSlotStates] = useState<
    Record<number, { state: SlotState; error?: string }>
  >({});

  const handlePick = async (slotIndex: number, file: File) => {
    setSlotStates((s) => ({ ...s, [slotIndex]: { state: "loading" } }));
    try {
      const compressed = await compressImage(file);
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
    <ProfileSection
      title="Photos"
      description="Your first photo is your main. It shows up on Discover and Map."
    >
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: SLOT_COUNT }).map((_, i) => {
          const photo = photos[i];
          const localState = slotStates[i];
          const state: SlotState =
            localState?.state ?? (photo ? "filled" : "empty");
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
      <p className="mt-3 text-caption text-text-muted">
        JPEG, PNG, or WebP up to 10MB each. Photos are compressed before saving.
      </p>
    </ProfileSection>
  );
}
