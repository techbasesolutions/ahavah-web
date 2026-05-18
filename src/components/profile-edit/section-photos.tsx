"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { ProfileSection } from "@/components/app/profile-field";
import { PhotoSlot } from "@/components/app/photo-slot";
import { Button } from "@/components/ui/button";
import {
  deletePhoto,
  listPhotos,
  reorderPhotos,
} from "@/lib/photo-storage";
import { usePhotoUpload, type StartOptions } from "@/lib/use-photo-upload";
import { useProfile } from "@/lib/use-profile";
import type { PhotoRecord } from "@/lib/photo-types";

const SLOT_COUNT = 6;

type SlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Photo grid for /profile/edit (Phase W backend pipeline).
 *
 * Mirrors /onboarding/photos's architecture (per-slot usePhotoUpload +
 * page-level records mirror), and adds reorder (up/down arrows) +
 * delete (trash icon) controls that map to PATCH photo_assignments and
 * DELETE files: [position] respectively. Both followed by refresh.
 *
 * Drag reorder is intentionally NOT used — building a full dnd-kit
 * Sortable around PhotoSlot mid-task would balloon scope. Up/down
 * arrows are accessible, mobile-friendly, and convey the same intent.
 */
export function PhotoEditSection() {
  const { update } = useProfile();
  const [records, setRecords] = useState<PhotoRecord[]>([]);

  const slot0 = usePhotoUpload();
  const slot1 = usePhotoUpload();
  const slot2 = usePhotoUpload();
  const slot3 = usePhotoUpload();
  const slot4 = usePhotoUpload();
  const slot5 = usePhotoUpload();
  const slotHooks = useMemo(
    () => [slot0, slot1, slot2, slot3, slot4, slot5] as const,
    [slot0, slot1, slot2, slot3, slot4, slot5],
  );

  const refreshFromBackend = useCallback(async () => {
    try {
      const list = await listPhotos();
      setRecords(list);
      // Profile.photos is now PhotoRecord[] (Task 3.8); push records direct.
      update({ photos: list });
    } catch {
      // Best-effort.
    }
  }, [update]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshFromBackend();
  }, [refreshFromBackend]);

  const moderationKinds = slotHooks.map((h) => h.state.kind).join("|");
  useEffect(() => {
    slotHooks.forEach((hook, idx) => {
      if (hook.state.kind === "moderating") {
        void (async () => {
          await refreshFromBackend();
          const position = idx + 1;
          const justUploaded = (await listPhotos()).find(
            (p) => p.position === position,
          );
          if (justUploaded) hook.confirmModeration(justUploaded);
        })();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moderationKinds, refreshFromBackend]);

  const handlePick = (slotIndex: SlotIndex, file: File) => {
    const opts: StartOptions = { position: slotIndex + 1 };
    void slotHooks[slotIndex].start(file, opts);
  };

  const handleRemove = async (slotIndex: SlotIndex) => {
    const rec = records[slotIndex];
    if (!rec) return;
    try {
      await deletePhoto(rec.position);
      await refreshFromBackend();
      slotHooks[slotIndex].reset();
    } catch {
      // Best-effort.
    }
  };

  /** Swap the photo at slotIndex with the photo at the adjacent (idx + delta).
   *  Builds a 2-key photo_assignments map and PATCHes it. */
  const handleSwap = async (slotIndex: number, delta: -1 | 1) => {
    const a = records[slotIndex];
    const b = records[slotIndex + delta];
    if (!a || !b) return;
    try {
      // photo_assignments semantics (duotypes PhotoAssignments): keys are
      // source positions, values are destination positions. Both items
      // must appear or the swap is a 1-way move and the destination
      // position will conflict.
      await reorderPhotos({
        [a.position]: b.position,
        [b.position]: a.position,
      });
      await refreshFromBackend();
    } catch {
      // Best-effort.
    }
  };

  type Visible = {
    state: "empty" | "loading" | "filled" | "pending-review" | "rejected" | "error";
    src?: string;
    error?: string;
  };
  function visibleFor(idx: SlotIndex): Visible {
    const hook = slotHooks[idx];
    switch (hook.state.kind) {
      case "compressing":
      case "uploading":
      case "moderating":
        return { state: "loading" };
      case "error":
        return { state: "error", error: hook.state.message };
      case "rejected":
        return { state: "rejected" };
      case "ready":
        return {
          state:
            hook.state.photo.moderation_state === "pending-review"
              ? "pending-review"
              : "filled",
          src: hook.state.photo.cdn_url || undefined,
        };
      case "idle":
      default:
        break;
    }
    const rec = records[idx];
    if (!rec || !rec.cdn_url) return { state: "empty" };
    switch (rec.moderation_state) {
      case "approved":
        return { state: "filled", src: rec.cdn_url };
      case "pending-review":
      case "uploading":
        return { state: "pending-review", src: rec.cdn_url };
      case "rejected":
        return { state: "rejected" };
      default:
        return { state: "empty" };
    }
  }

  return (
    <ProfileSection
      title="Photos"
      description="Your first photo is your main. It shows up on Discover and Map."
    >
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: SLOT_COUNT }).map((_, i) => {
          const idx = i as SlotIndex;
          const vis = visibleFor(idx);
          const filled =
            vis.state === "filled" || vis.state === "pending-review";
          const canMoveUp = filled && i > 0 && Boolean(records[i - 1]);
          const canMoveDown =
            filled && i < SLOT_COUNT - 1 && Boolean(records[i + 1]);
          return (
            <div key={i} className="flex flex-col gap-1.5">
              <PhotoSlot
                index={i}
                isMain={i === 0}
                state={vis.state}
                src={vis.src}
                errorMessage={vis.error}
                onPick={(file) => handlePick(idx, file)}
                onRemove={filled ? () => void handleRemove(idx) : undefined}
                onClearRejected={
                  vis.state === "rejected"
                    ? () => slotHooks[idx].reset()
                    : undefined
                }
              />
              {filled && (
                <div className="flex items-center justify-between gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move photo ${i + 1} up`}
                    disabled={!canMoveUp}
                    onClick={() => void handleSwap(i, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete photo ${i + 1}`}
                    onClick={() => void handleRemove(idx)}
                  >
                    <Trash2 className="size-4 text-pink" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move photo ${i + 1} down`}
                    disabled={!canMoveDown}
                    onClick={() => void handleSwap(i, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-caption text-(--ink-3)">
        JPEG, PNG, or WebP. Photos are compressed before upload, then
        reviewed by automated moderation.
      </p>
    </ProfileSection>
  );
}
