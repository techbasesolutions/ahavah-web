"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { PhotoSlot } from "@/components/app/photo-slot";
import { listPhotos } from "@/lib/photo-storage";
import { readOnboarded } from "@/lib/onboarded-storage";
import { usePhotoQuota } from "@/lib/use-photo-quota";
import { usePhotoUpload, type StartOptions } from "@/lib/use-photo-upload";
import { useProfile } from "@/lib/use-profile";
import type { PhotoRecord } from "@/lib/photo-types";

/**
 * /onboarding/photos
 *
 * Phase W rewire: photo I/O goes through the backend pipeline. Each slot
 * owns its own usePhotoUpload hook; after a slot's upload settles into
 * `moderating`, we refresh the photo list from the backend and push the
 * resolved PhotoRecord back into the hook via confirmModeration() so the
 * slot can transition to ready / rejected.
 *
 * The page maintains a local `records: PhotoRecord[]` mirror of the
 * backend state and mirrors it into `profile.photos: PhotoRecord[]` so
 * consumer surfaces (map-avatar, discover, profile-detail) stay in sync.
 *
 * "Continue" gating: brief asks for "approved" as the safety pick. As of
 * 2026-05-12 the backend doesn't yet surface nsfw_score in GET, so every
 * photo resolves to pending-review on refresh. We accept either approved
 * OR pending-review as the gate (the alternative the brief documented)
 * so onboarding isn't permanently blocked until backend surfaces the
 * score. Update gating once nsfw_score lands in GET /profile-info.
 */

const SLOT_COUNT = 6;

type SlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

export default function PhotosStep() {
  const { update } = useProfile();
  const { quota } = usePhotoQuota();
  const [records, setRecords] = useState<PhotoRecord[]>([]);

  // Per-slot upload hooks. SLOT_COUNT is small + fixed so we instantiate
  // each up front (Rules of Hooks).
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

  /** Pull the latest photo list from the backend and project CDN URLs
   *  into the local profile mirror. Called on mount + after every upload.
   *
   *  Onboardees have no GET /onboardee-info endpoint, so listPhotos()
   *  (which calls /profile-info) 401s. We just no-op the fetch in that
   *  case — records are maintained from upload results below.
   */
  const refreshFromBackend = useCallback(async () => {
    if (!readOnboarded()) return; // onboardee: no backend list available
    try {
      const list = await listPhotos();
      setRecords(list);
      update({ photos: list });
    } catch {
      // best-effort
    }
  }, [update]);

  // Initial mount-fetch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshFromBackend();
  }, [refreshFromBackend]);

  // When any slot enters "moderating", advance it. For PERSON users, fetch
  // the resolved PhotoRecord from the backend. For ONBOARDEES (no GET
  // endpoint), synthesize an optimistic PhotoRecord — the cron will
  // re-classify async; the slot can transition to "ready" right now so
  // the user can hit Continue.
  const moderationKinds = slotHooks.map((h) => h.state.kind).join("|");
  useEffect(() => {
    slotHooks.forEach((hook, idx) => {
      if (hook.state.kind !== "moderating") return;
      const position = idx + 1;
      void (async () => {
        if (readOnboarded()) {
          await refreshFromBackend();
          const justUploaded = (await listPhotos()).find(
            (p) => p.position === position,
          );
          if (justUploaded) hook.confirmModeration(justUploaded);
          return;
        }
        // Onboardee path: synthesize the record + push it locally.
        const synthetic: PhotoRecord = {
          uuid: `pending-${position}`,
          cdn_url: "",
          position,
          moderation_state: "pending-review",
          nsfw_score: null,
          created_at: new Date().toISOString(),
        };
        // Treat as approved for Continue-gate purposes so onboarding
        // can proceed — cron may demote later.
        hook.confirmModeration({ ...synthetic, moderation_state: "approved" });
        setRecords((prev) => {
          const next = [...prev];
          next[idx] = synthetic;
          return next;
        });
      })();
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
      const { deletePhoto } = await import("@/lib/photo-storage");
      await deletePhoto(rec.position);
      await refreshFromBackend();
      slotHooks[slotIndex].reset();
    } catch {
      // Surface via slot — currently no toast layer.
    }
  };

  // Derive the visible state for each slot from BOTH the upload hook
  // (transient: compressing / uploading / moderating / error) AND the
  // backend records (persistent: approved / pending-review / rejected /
  // missing).
  type Visible = {
    state: "empty" | "loading" | "filled" | "pending-review" | "rejected" | "error";
    src?: string;
    error?: string;
  };
  function visibleFor(idx: SlotIndex): Visible {
    const hook = slotHooks[idx];
    // Transient hook states win over the backend snapshot.
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
        // Fall through to backend record.
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

  // Continue is enabled when at least one photo is approved OR pending-review,
  // OR a slot is in a state past "uploading" (moderating / ready) for
  // onboardees who never receive a backend records refresh.
  const hasUsablePhoto =
    records.some(
      (r) =>
        r &&
        (r.moderation_state === "approved" ||
          r.moderation_state === "pending-review"),
    ) ||
    slotHooks.some((h) => h.state.kind === "moderating" || h.state.kind === "ready");
  const isComplete = hasUsablePhoto;

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
          const idx = i as SlotIndex;
          const vis = visibleFor(idx);
          return (
            <PhotoSlot
              key={i}
              index={i}
              isMain={i === 0}
              state={vis.state}
              src={vis.src}
              errorMessage={vis.error}
              onPick={(file) => handlePick(idx, file)}
              onRemove={
                vis.state === "filled" || vis.state === "pending-review"
                  ? () => void handleRemove(idx)
                  : undefined
              }
              onClearRejected={
                vis.state === "rejected"
                  ? () => slotHooks[idx].reset()
                  : undefined
              }
            />
          );
        })}
      </div>

      <p className="mt-4 text-caption text-text-secondary" aria-live="polite">
        {hasUsablePhoto
          ? `${quota.currentPhotoCount} of ${SLOT_COUNT} added.`
          : "At least one photo required."}
      </p>
      <p className="mt-1 text-caption text-text-muted">
        JPEG, PNG, or WebP. Photos are compressed before upload, then
        reviewed by automated moderation.
      </p>
    </OnboardingShell>
  );
}
