"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Loader2,
  Smartphone,
  Sun,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";

import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { useBronzeVerification } from "@/lib/use-bronze-verification";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIER_COLOR = "#CD7F32";

const STEPS = [
  {
    Icon: Sun,
    title: "Find a well-lit spot",
    description:
      "Face a window or a lamp; avoid backlighting. Remove sunglasses or a hat.",
  },
  {
    Icon: Camera,
    title: "Take a selfie",
    description:
      "We need front-camera access. Mobile opens the camera; desktop opens a file picker.",
  },
  {
    Icon: BadgeCheck,
    title: "We cross-check with your photos",
    description:
      "An automated check confirms the selfie matches your profile photos. Usually finishes within 1–2 minutes.",
  },
];

export default function VerifyBronzePage() {
  const { state, start, reset } = useBronzeVerification();
  const inputRef = useRef<HTMLInputElement>(null);

  const busy =
    state.kind === "compressing" ||
    state.kind === "uploading" ||
    state.kind === "queueing" ||
    state.kind === "reviewing";

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always clear the input so picking the same file twice still fires
    // onChange (browsers don't re-fire for identical values otherwise).
    e.target.value = "";
    if (!file) return;
    void start(file);
  };

  const handleTakeSelfie = () => {
    inputRef.current?.click();
  };

  const statusLabel = (() => {
    switch (state.kind) {
      case "compressing":
        return "Preparing photo…";
      case "uploading":
        return "Uploading…";
      case "queueing":
        return "Queueing review…";
      case "reviewing":
        return "Reviewing — this usually takes 1–2 minutes…";
      default:
        return "";
    }
  })();

  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to verification"
          render={<Link href="/verify" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Bronze verification</PageHeaderTitle>
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
              <Smartphone />
            </IconBadge>
          </div>
          <div className="flex max-w-sm flex-col gap-2">
            <h2 className="text-h2 leading-tight text-white">Profile verified</h2>
            <p className="text-body leading-relaxed text-text-secondary">
              A short selfie confirms you&apos;re a real person and matches
              your profile photos. Most people finish in under two minutes.
            </p>
          </div>
        </motion.div>

        {/* Steps */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.06 }}
          className="flex flex-col gap-4"
          aria-label="How it works"
        >
          <h2 className="text-overline text-text-muted">How it works</h2>
          <div className="relative">
            <span
              aria-hidden
              className="absolute top-5 bottom-5 left-5 z-0 w-px bg-white/10"
            />
            <ol className="flex flex-col gap-5">
              {STEPS.map((step, i) => (
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
                      <p className="text-meta font-semibold text-white">
                        {step.title}
                      </p>
                      <p className="mt-1 text-caption leading-relaxed text-text-muted">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </motion.section>

        {/* Action area — adapts to the current state. */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.18 }}
          className="mt-auto flex flex-col gap-3 pt-2 pb-2"
        >
          {/* Approved success card */}
          {state.kind === "approved" && (
            <div
              role="status"
              className="flex flex-col items-center gap-2 rounded-2xl border border-lime/40 bg-lime/10 p-5 text-center"
            >
              <CheckCircle2 className="size-10 text-lime" aria-hidden />
              <p className="text-h3 text-white">You&apos;re Bronze-verified</p>
              <p className="text-meta text-text-secondary">
                Your badge is live on your profile. Try Silver or Gold to
                level up.
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

          {/* Rejected — surface reason + retry */}
          {state.kind === "rejected" && (
            <div
              role="alert"
              aria-live="polite"
              className="flex flex-col items-center gap-2 rounded-2xl border border-pink/40 bg-pink/10 p-5 text-center"
            >
              <XCircle className="size-10 text-pink" aria-hidden />
              <p className="text-h3 text-white">Photo declined</p>
              <p className="text-meta text-text-secondary">{state.reason}</p>
              <Button
                size="lg"
                tone="brand"
                className="mt-2"
                onClick={reset}
              >
                Try another selfie
              </Button>
            </div>
          )}

          {/* Error — surface message + retry */}
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

          {/* Busy state — visible spinner + label */}
          {busy && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-bg-elevated/60 p-5 text-center"
            >
              <Loader2 className="size-8 animate-spin text-lavender" />
              <p className="text-meta text-text-secondary">{statusLabel}</p>
              {state.kind === "reviewing" ? (
                <p className="text-caption text-text-muted">
                  You can leave this page — we&apos;ll update your badge
                  automatically.
                </p>
              ) : null}
            </div>
          )}

          {/* Idle — primary CTA opens file picker / camera */}
          {state.kind === "idle" && (
            <>
              <p className="text-center text-caption text-text-muted">
                Takes about 60 seconds.
              </p>
              <Button
                size="cta"
                tone="brand"
                lift="float"
                className="ring-2 ring-(--tier-color) ring-offset-2 ring-offset-bg-canvas"
                onClick={handleTakeSelfie}
              >
                Take selfie
              </Button>
              <p className="text-center text-caption leading-relaxed text-text-muted">
                The selfie is processed by our verification cron. Only a
                yes/no result is stored on our server.
              </p>
            </>
          )}

          {/* Hidden file input. capture="user" hints the front camera on
              mobile; desktop falls back to the standard file picker. */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            capture="user"
            onChange={handleFileChosen}
            className="hidden"
            tabIndex={-1}
            aria-label="Selfie for Bronze verification"
            title="Selfie for Bronze verification"
          />
        </motion.div>
      </div>
    </PageShell>
  );
}
