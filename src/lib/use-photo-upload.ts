/**
 * usePhotoUpload — finite-state hook for the per-slot upload pipeline.
 *
 *   idle
 *     ↓ start(file, opts)
 *   compressing
 *     ↓ compressImage() succeeds
 *   uploading
 *     ↓ uploadPhoto() resolves
 *   moderating  (optimistic; backend cron will eventually classify)
 *     ↓ confirmModeration(updatedPhoto) — caller pushes the resolved
 *       PhotoRecord (typically after a refreshProfile() roundtrip).
 *       - approved      → ready
 *       - pending-review → stays moderating (the cron is still chewing)
 *       - rejected      → rejected (caller may surface a toast + reset)
 *
 * `reset()` returns to `idle` from any state. `start()` rejects mid-state
 * transitions if the hook isn't idle (guards against double-tap).
 *
 * Upload-progress UX note: fetch() does not expose upload progress and
 * JSON-body requests can't realistically use XHR.upload either (we'd
 * have to handcraft the boundary). The state machine therefore exposes
 * an "uploading" state with no byte counter; consumers render a
 * determinate spinner + a small "Uploading..." caption + optionally the
 * estimated compressed-blob size. The PhotoRecord that comes out at the
 * end has no client-side bytes at all (CDN URL only).
 *
 * Compression runs OUTSIDE the hook's main effect — calling code holds
 * the File from the input event, hands it to start(), and the hook
 * orchestrates compress → upload. Compression failures (e.g. user
 * picked a non-image) flip the state straight to "error".
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { compressImage } from "@/lib/image-compress";
import { uploadPhoto } from "@/lib/photo-storage";
import type { PhotoRecord, UploadState } from "@/lib/photo-types";

export type StartOptions = {
  position: number;
  top?: number;
  left?: number;
};

export type UsePhotoUploadResult = {
  state: UploadState;
  start: (file: File, options: StartOptions) => Promise<void>;
  confirmModeration: (updated: PhotoRecord) => void;
  reset: () => void;
};

/** Local-only previewUrl management: we synthesize an object URL from
 *  the original file so the UI can show a preview while compressing +
 *  uploading. The URL is revoked on reset() / transition to ready. */
export function usePhotoUpload(): UsePhotoUploadResult {
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const previewUrlRef = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    revokePreview();
    setState({ kind: "idle" });
  }, [revokePreview]);

  const start = useCallback(
    async (file: File, options: StartOptions) => {
      // Re-entrancy guard. start() is a no-op when not idle.
      if (state.kind !== "idle" && state.kind !== "error" && state.kind !== "rejected") {
        return;
      }
      revokePreview();
      previewUrlRef.current = URL.createObjectURL(file);
      setState({ kind: "compressing" });

      let compressedBlob: Blob;
      try {
        const compressed = await compressImage(file);
        // Convert the data URL back to a Blob for the storage layer.
        // (compressImage returns a dataUrl + bytes; uploadPhoto reads via
        // FileReader, so a Blob carrying the same compressed bytes is the
        // cleanest handoff.)
        compressedBlob = dataUrlToBlob(compressed.dataUrl);
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Could not compress image.",
        });
        return;
      }

      // Use a stable preview URL throughout the uploading phase.
      const preview = previewUrlRef.current ?? "";
      setState({
        kind: "uploading",
        // Progress is determinate-spinner only. We expose a zero/zero
        // tuple so the UploadState shape stays stable across consumers.
        progress: { loadedBytes: 0, totalBytes: 0 },
        previewUrl: preview,
      });

      try {
        const { photo } = await uploadPhoto(compressedBlob, options);
        setState({ kind: "moderating", previewUrl: preview });
        // The caller is responsible for refetching the profile + pushing
        // the resolved PhotoRecord back via confirmModeration().
        // Suppress lint: `photo` is the optimistic record (pending-review,
        // no UUID). The real one comes via confirmModeration().
        void photo;
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    },
    [revokePreview, state.kind],
  );

  const confirmModeration = useCallback(
    (updated: PhotoRecord) => {
      // Only advance from moderating; ignore stale callbacks fired after
      // a reset or error transition.
      setState((prev) => {
        if (prev.kind !== "moderating") return prev;
        switch (updated.moderation_state) {
          case "approved":
            revokePreview();
            return { kind: "ready", photo: updated };
          case "rejected":
            return {
              kind: "rejected",
              reason: "Photo declined by moderation.",
              previewUrl: prev.previewUrl,
            };
          case "pending-review":
          case "uploading":
          default:
            return prev;
        }
      });
    },
    [revokePreview],
  );

  return { state, start, confirmModeration, reset };
}

/** Decode a `data:image/jpeg;base64,...` URL into a Blob. Used to bridge
 *  compressImage's dataUrl output and uploadPhoto's Blob input. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mimeMatch = meta?.match(/^data:([^;]+);base64$/);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(b64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
