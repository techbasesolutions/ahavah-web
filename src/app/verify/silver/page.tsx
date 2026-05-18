"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ScanFace,
  Sun,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { ProgressDots } from "@/components/app/progress-dots";

import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import {
  SILVER_FRAME_PROMPTS,
  useSilverVerification,
} from "@/lib/use-silver-verification";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIER_COLOR = "#C0C0C0";

const HOWTO = [
  {
    Icon: Sun,
    title: "Find a well-lit spot",
    description:
      "Face a window or a lamp; avoid backlighting. Remove sunglasses or a hat.",
  },
  {
    Icon: ScanFace,
    title: "Three quick selfies",
    description:
      "We'll prompt for: look straight, turn slightly right, turn slightly left. Keep the camera steady between captures.",
  },
  {
    Icon: CheckCircle2,
    title: "We confirm same person across all three",
    description:
      "An automated check matches each selfie to your profile photos AND to each other. Usually finishes within 1–2 minutes.",
  },
];

export default function VerifySilverPage() {
  const { state, begin, capture, reset } = useSilverVerification();
  const inputRef = useRef<HTMLInputElement>(null);

  const busy =
    state.kind === "compressing" ||
    state.kind === "uploading" ||
    state.kind === "queueing" ||
    state.kind === "reviewing";

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void capture(file);
  };

  const handleOpenCamera = () => {
    inputRef.current?.click();
  };

  const statusLabel = (() => {
    switch (state.kind) {
      case "compressing":
        return `Preparing photo ${state.frame} of 3…`;
      case "uploading":
        return "Uploading all three…";
      case "queueing":
        return "Queueing review…";
      case "reviewing":
        return "Reviewing — this usually takes 1–2 minutes…";
      default:
        return "";
    }
  })();

  const activeFrame = state.kind === "capturing" ? state.frame : null;
  const completedFrames =
    state.kind === "capturing" ? state.captured.length : 0;

  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle-lg"
          tone="elevated"
          aria-label="Back to verification"
          render={<Link href="/verify" prefetch={false} />}
        >
          <ArrowLeft className="text-(--ink)" />
        </Button>
        <PageHeaderTitle>Silver verification</PageHeaderTitle>
      </PageHeader>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-112 bg-[radial-gradient(ellipse_at_50%_0%,var(--tier-color)_0%,transparent_65%)] opacity-25 blur-3xl"
        style={{ "--tier-color": TIER_COLOR } as React.CSSProperties}
      />

      <div
        className="relative z-10 flex flex-1 flex-col gap-7 px-5 pt-2"
        style={{ "--tier-color": TIER_COLOR } as React.CSSProperties}
      >
        {/* Hero */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-5 py-4 text-center"
        >
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-0 scale-150 rounded-full bg-(--tier-color) opacity-30 blur-2xl"
            />
            <IconBadge tone="tier" size="2xl" className="relative">
              <ScanFace />
            </IconBadge>
          </div>
          <div className="flex max-w-sm flex-col gap-2">
            <h2 className="text-h2 leading-tight text-(--ink)">
              Liveness verified
            </h2>
            <p className="text-body leading-relaxed text-(--ink-2)">
              Three quick selfies with different head angles prove
              you&apos;re a live person — not a single photo held to
              the camera. Stronger trust signal than Bronze, no ID
              upload like Gold.
            </p>
          </div>
        </motion.div>

        {/* How-to */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.06 }}
          className="flex flex-col gap-4"
          aria-label="How it works"
        >
          <h2 className="text-overline text-(--ink-3)">How it works</h2>
          <div className="relative">
            <span
              aria-hidden
              className="absolute top-5 bottom-5 left-5 z-0 w-px bg-foreground/10"
            />
            <ol className="flex flex-col gap-5">
              {HOWTO.map((step, i) => (
                <li key={step.title}>
                  <div className="relative flex items-start gap-4">
                    <IconBadge
                      tone="tierOutlined"
                      shape="circle"
                      size="md"
                      className="relative z-10 text-meta font-bold tabular-nums tracking-tight"
                      aria-hidden
                    >
                      {i + 1}
                    </IconBadge>
                    <div className="flex-1 pt-1.5">
                      <p className="text-meta font-semibold text-(--ink)">
                        {step.title}
                      </p>
                      <p className="mt-1 text-caption leading-relaxed text-(--ink-3)">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </motion.section>

        {/* Action area */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.18 }}
          className="mt-auto flex flex-col gap-3 pt-2 pb-2"
        >
          {/* Capturing — show the active prompt + 1/3 progress */}
          {state.kind === "capturing" && activeFrame ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-(--card)/60 p-5 text-center"
            >
              <ProgressDots
                count={3}
                active={completedFrames}
                size="md"
                tone="white"
              />
              <p className="text-h3 text-(--ink)">
                {SILVER_FRAME_PROMPTS[activeFrame].title}
              </p>
              <p className="text-meta text-(--ink-2)">
                {SILVER_FRAME_PROMPTS[activeFrame].hint}
              </p>
              <Button
                size="cta"
                tone="brand"
                lift="float"
                className="mt-2 ring-2 ring-(--tier-color) ring-offset-2 ring-offset-bg-canvas"
                onClick={handleOpenCamera}
              >
                Capture selfie {activeFrame} of 3
              </Button>
              <button
                type="button"
                onClick={reset}
                className="mt-1 text-caption text-(--ink-3) underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Cancel and start over
              </button>
            </div>
          ) : null}

          {/* Approved */}
          {state.kind === "approved" && (
            <div
              role="status"
              className="flex flex-col items-center gap-2 rounded-2xl border border-lime/40 bg-lime/10 p-5 text-center"
            >
              <CheckCircle2 className="size-10 text-lime" aria-hidden />
              <p className="text-h3 text-(--ink)">You&apos;re Silver-verified</p>
              <p className="text-meta text-(--ink-2)">
                Your badge is live on your profile. Try Gold for
                government-ID verification.
              </p>
              <Button
                size="lg"
                tone="brand"
                className="mt-2"
                nativeButton={false}
                render={<Link href="/verify" prefetch={false} />}
              >
                Done
              </Button>
            </div>
          )}

          {/* Rejected */}
          {state.kind === "rejected" && (
            <div
              role="alert"
              aria-live="polite"
              className="flex flex-col items-center gap-2 rounded-2xl border border-pink/40 bg-pink/10 p-5 text-center"
            >
              <XCircle className="size-10 text-pink" aria-hidden />
              <p className="text-h3 text-(--ink)">Burst declined</p>
              <p className="text-meta text-(--ink-2)">{state.reason}</p>
              <Button
                size="lg"
                tone="brand"
                className="mt-2"
                onClick={reset}
              >
                Start over
              </Button>
            </div>
          )}

          {/* Error */}
          {state.kind === "error" && (
            <div
              role="alert"
              aria-live="polite"
              className="flex flex-col items-center gap-2 rounded-2xl border border-pink/40 bg-pink/10 p-5 text-center"
            >
              <p className="text-meta font-semibold text-pink">
                {state.message}
              </p>
              <Button
                size="lg"
                tone="brand"
                className="mt-2"
                onClick={reset}
              >
                Try again
              </Button>
            </div>
          )}

          {/* Busy */}
          {busy && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-(--card)/60 p-5 text-center"
            >
              <Loader2 className="size-8 animate-spin text-lavender" />
              <p className="text-meta text-(--ink-2)">{statusLabel}</p>
              {state.kind === "reviewing" ? (
                <p className="text-caption text-(--ink-3)">
                  You can leave this page — we&apos;ll update your badge
                  automatically.
                </p>
              ) : null}
            </div>
          )}

          {/* Idle — primary CTA starts the burst */}
          {state.kind === "idle" && (
            <>
              <p className="text-center text-caption text-(--ink-3)">
                Three quick captures. Takes about 90 seconds total.
              </p>
              <Button
                size="cta"
                tone="brand"
                lift="float"
                className="ring-2 ring-(--tier-color) ring-offset-2 ring-offset-bg-canvas"
                onClick={begin}
              >
                Start liveness check
              </Button>
              <p className="text-center text-caption leading-relaxed text-(--ink-3)">
                Each selfie is processed by the same verification cron
                Bronze uses. Only the yes/no result is stored.
              </p>
            </>
          )}

          {/* Hidden file input — same camera-hint as Bronze. */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            capture="user"
            onChange={handleFileChosen}
            className="hidden"
            tabIndex={-1}
            aria-label="Selfie for Silver verification"
            title="Selfie for Silver verification"
          />
        </motion.div>
      </div>
    </PageShell>
  );
}
