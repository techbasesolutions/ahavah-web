"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import { compressImage } from "@/lib/image-compress";
import { stripDataUrlPrefix } from "@/lib/photo-storage";
import { useProfile } from "@/lib/use-profile";

/**
 * Silver verification — 3-frame challenge run through the same
 * GPT-4.1 vision classifier as Bronze. Frontend captures three
 * selfies one-after-the-other (different head poses); the backend
 * passes the additional two as `claimed_uuids` to the existing
 * `verify()` function. A successful run promotes the user to
 * `ahavah_verification_tier = 'silver'`.
 *
 * State machine — close kin of useBronzeVerification, but with a
 * `frame` index since the user has to capture three times before the
 * first network request fires.
 */

type CheckVerificationRow = {
  status?: string | null;
  message?: string | null;
};

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 90_000;

export type SilverState =
  | { kind: "idle" }
  | { kind: "capturing"; frame: 1 | 2 | 3; captured: ReadonlyArray<string> }
  | { kind: "compressing"; frame: 1 | 2 | 3 }
  | { kind: "uploading" }
  | { kind: "queueing" }
  | { kind: "reviewing" }
  | { kind: "approved" }
  | { kind: "rejected"; reason: string }
  | { kind: "error"; message: string };

/** Per-step prompt the UI surfaces for the active frame. Mirrors the
 *  three head positions our classifier requires across the burst. */
export const SILVER_FRAME_PROMPTS: Readonly<
  Record<1 | 2 | 3, { title: string; hint: string }>
> = {
  1: {
    title: "Look straight at the camera",
    hint: "Smile and touch your eyebrow with your free hand.",
  },
  2: {
    title: "Turn your head slightly to the right",
    hint: "Keep your eyes on the camera. Hold for the snap.",
  },
  3: {
    title: "Turn your head slightly to the left",
    hint: "Same gentle turn, opposite direction.",
  },
};

export function useSilverVerification(): {
  state: SilverState;
  /** Begin the burst (resets prior captures and surfaces frame 1). */
  begin: () => void;
  /** Submit the next frame in the burst. After frame 3 the API calls fire. */
  capture: (file: File) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<SilverState>({ kind: "idle" });
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDeadlineRef = useRef<number>(0);
  // Refresh /profile-info on success so /verify + /profile + the peer
  // view all see the new tier ('silver') without a manual reload.
  const { refreshProfile } = useProfile();

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ kind: "idle" });
  }, [stopPolling]);

  const begin = useCallback(() => {
    stopPolling();
    setState({ kind: "capturing", frame: 1, captured: [] });
  }, [stopPolling]);

  const tickRef = useRef<() => Promise<void>>(async () => {});
  const tickImpl = useCallback(async () => {
    try {
      const row = await apiClient.get<CheckVerificationRow>("/check-verification");
      const status = row.status ?? "";
      if (status === "success") {
        stopPolling();
        setState({ kind: "approved" });
        void refreshProfile();
        return;
      }
      if (status === "failure") {
        stopPolling();
        setState({ kind: "rejected", reason: row.message ?? "Photo declined." });
        return;
      }
      if (Date.now() > pollDeadlineRef.current) {
        stopPolling();
        setState({
          kind: "error",
          message: "Verification is taking longer than usual. Try again shortly.",
        });
        return;
      }
      pollTimerRef.current = setTimeout(() => void tickRef.current(), POLL_INTERVAL_MS);
    } catch (err) {
      stopPolling();
      const msg =
        err instanceof ApiError ? err.message : "Couldn't reach verification.";
      setState({ kind: "error", message: msg });
    }
  }, [stopPolling, refreshProfile]);

  useEffect(() => {
    tickRef.current = tickImpl;
  }, [tickImpl]);

  const submitBurst = useCallback(
    async (frames: ReadonlyArray<string>) => {
      setState({ kind: "uploading" });
      try {
        await apiClient.post("/verification-multi-selfie", {
          frames: frames.map((b, i) => ({
            position: i + 1,
            base64: b,
            top: 0,
            left: 0,
          })),
        });
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Selfie upload failed.";
        setState({ kind: "error", message: msg });
        return;
      }

      setState({ kind: "queueing" });
      try {
        await apiClient.post("/verify", {});
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Couldn't queue verification.";
        setState({ kind: "error", message: msg });
        return;
      }

      setState({ kind: "reviewing" });
      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
      void tickRef.current();
    },
    [],
  );

  const capture = useCallback(
    async (file: File) => {
      // Capture is only valid while the state machine is in the
      // `capturing` phase. Defensive guard so a delayed file picker
      // can't race past the burst submit.
      if (state.kind !== "capturing") return;
      const frame = state.frame;
      const prevCaptured = state.captured;

      setState({ kind: "compressing", frame });
      let base64: string;
      try {
        const compressed = await compressImage(file);
        base64 = stripDataUrlPrefix(compressed.dataUrl);
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Could not read selfie.",
        });
        return;
      }

      const nextCaptured = [...prevCaptured, base64];

      if (frame === 3) {
        // All three frames in hand — fire the burst submit.
        await submitBurst(nextCaptured);
        return;
      }

      // Move to the next capture step. Cast covers the 1|2|3 narrowing
      // — frame 3 returned above so the next step is always 2 or 3.
      const nextFrame = (frame + 1) as 1 | 2 | 3;
      setState({
        kind: "capturing",
        frame: nextFrame,
        captured: nextCaptured,
      });
    },
    [state, submitBurst],
  );

  return { state, begin, capture, reset };
}
