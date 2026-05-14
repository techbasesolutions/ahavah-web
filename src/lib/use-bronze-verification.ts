"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import { compressImage } from "@/lib/image-compress";
import { stripDataUrlPrefix } from "@/lib/photo-storage";

/**
 * Bronze-tier verification flow (real backend wiring).
 *
 * Bronze isn't Stripe Identity — it's a selfie-based check the
 * upstream Duolicious fork runs via on-device-style ONNX models.
 * Flow:
 *
 *   idle
 *     ↓ start(file)
 *   compressing
 *     ↓
 *   uploading       (POST /verification-selfie {base64_file:{position:1,base64,top:0,left:0}})
 *     ↓
 *   queueing        (POST /verify — flips job status to 'queued')
 *     ↓
 *   reviewing       (GET /check-verification polled every 3s)
 *     ↓
 *   approved | rejected | error
 *
 * The cron `verificationjobrunner` processes the queue. Verdict
 * surfaces in `/check-verification`'s response.
 */

export type BronzeState =
  | { kind: "idle" }
  | { kind: "compressing" }
  | { kind: "uploading" }
  | { kind: "queueing" }
  | { kind: "reviewing" }
  | { kind: "approved" }
  | { kind: "rejected"; reason: string }
  | { kind: "error"; message: string };

type CheckVerificationRow = {
  status?: string;
  message?: string;
};

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 90_000; // 90s — cron polls verification_job every 60s

export function useBronzeVerification(): {
  state: BronzeState;
  start: (file: File) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<BronzeState>({ kind: "idle" });
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDeadlineRef = useRef<number>(0);

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

  // Held in a ref so the body can self-reschedule without the linter
  // complaining about pre-declaration self-reference inside useCallback.
  // useEffect updates the ref each render so the latest closure is
  // always reachable from the setTimeout callback.
  const tickRef = useRef<() => Promise<void>>(async () => {});
  const tickImpl = useCallback(async () => {
    try {
      const row = await apiClient.get<CheckVerificationRow>("/check-verification");
      const status = row.status ?? "";
      if (status === "success") {
        stopPolling();
        setState({ kind: "approved" });
        return;
      }
      if (status === "failure") {
        stopPolling();
        setState({ kind: "rejected", reason: row.message ?? "Photo declined." });
        return;
      }
      // 'queued' / 'uploading-photo' / 'in-progress' — keep polling.
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
  }, [stopPolling]);

  useEffect(() => {
    tickRef.current = tickImpl;
  }, [tickImpl]);

  const start = useCallback(
    async (file: File) => {
      stopPolling();
      setState({ kind: "compressing" });
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

      setState({ kind: "uploading" });
      try {
        await apiClient.post("/verification-selfie", {
          base64_file: {
            position: 1,
            base64,
            top: 0,
            left: 0,
          },
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
    [stopPolling],
  );

  return { state, start, reset };
}
