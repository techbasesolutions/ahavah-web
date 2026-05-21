"use client";

// Inline style + arbitrary Tailwind values are required here for the brand
// display-font sizes and the gradient share-card surface (clamp/var()/oklch()
// gradients the token scale doesn't cover) — same trade-off documented in
// src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Share2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo-mark";

const STORY_W = 1080;
const STORY_H = 1920;
const SHARE_URL = "https://ahavah.app";
const CAPTION =
  "I just joined the Ahavah waitlist. Torah-observant matchmaking for serious believers, aligned in Torah, faith, family, and covenant. Join me: ahavah.app";

// Draw the 9:16 story image to an offscreen canvas and resolve a PNG blob.
// Uses a plain bold sans stack: webfonts are not reliably nameable on canvas
// (next/font hashes the family), so we accept the system sans fallback for the
// downloadable image. The on-screen preview below uses the real brand fonts.
async function drawStory(position: number | null): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, STORY_W, STORY_H);
  grad.addColorStop(0, "#1a1340");
  grad.addColorStop(1, "#3b2f7a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Brand mark (same-origin SVG; best-effort).
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 200;
      ctx.drawImage(img, (STORY_W - size) / 2, 320, size, size);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "/icon-512.svg";
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 96px system-ui, sans-serif";
  ctx.fillText("I'm on the", STORY_W / 2, 740);
  ctx.fillText("Ahavah waitlist.", STORY_W / 2, 850);

  if (position) {
    ctx.fillStyle = "#d7ff81";
    ctx.font = "800 150px system-ui, sans-serif";
    ctx.fillText(`#${position.toLocaleString()}`, STORY_W / 2, 1110);
  }

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "500 48px system-ui, sans-serif";
  ctx.fillText("Torah-observant matchmaking", STORY_W / 2, 1320);
  ctx.fillText("for serious believers.", STORY_W / 2, 1384);

  ctx.fillStyle = "#d7ff81";
  ctx.font = "700 56px system-ui, sans-serif";
  ctx.fillText("ahavah.app", STORY_W / 2, 1660);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function WaitlistShareCard({ position }: { position: number | null }) {
  const [copied, setCopied] = useState(false);
  // Only true after mount AND when the Web Share API exists. Starts false so
  // SSR and the first client render agree (no hydration mismatch); the effect
  // flips it on share-capable browsers.
  const [shareReady, setShareReady] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShareReady(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const handleSave = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const blob = await drawStory(position);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ahavah-waitlist.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      busy.current = false;
    }
  }, [position]);

  const handleShare = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const blob = await drawStory(position);
      const file = blob
        ? new File([blob], "ahavah-waitlist.png", { type: "image/png" })
        : null;
      const nav = navigator as Navigator & {
        canShare?: (d?: ShareData) => boolean;
      };
      if (file && nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Ahavah", text: CAPTION, url: SHARE_URL });
      } else if (navigator.share) {
        await navigator.share({ title: "Ahavah", text: CAPTION, url: SHARE_URL });
      }
    } catch {
      /* user cancelled / unsupported */
    } finally {
      busy.current = false;
    }
  }, [position]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CAPTION);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }, []);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="text-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
          Spread the word
        </span>
        <p className="mt-1.5 text-body font-semibold text-(--ink)">Invite a friend.</p>
      </div>

      {/* On-screen preview (brand fonts) — mirrors the saved story image */}
      <Card
        tone="elevated"
        className="relative w-full max-w-[280px] aspect-[9/16] items-center justify-center gap-4 overflow-hidden rounded-[32px] p-7 text-center text-white ring-1 ring-white/10"
        style={{ background: "linear-gradient(160deg, #1a1340 0%, #2d2568 55%, #3b2f7a 100%)" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 left-1/2 size-40 -translate-x-1/2 rounded-full bg-lime/25 blur-3xl"
        />
        <Sparkles aria-hidden className="absolute right-5 top-5 size-4 text-lime/70" />

        <LogoMark size={40} decorative className="relative" />

        <div className="relative" style={{ fontFamily: "var(--font-display)", fontSize: "25px", lineHeight: 1.08 }}>
          I&apos;m on the
          <br />
          Ahavah waitlist.
        </div>

        {position ? (
          <div className="relative inline-flex flex-col items-center">
            <span className="text-lime" style={{ fontFamily: "var(--font-display)", fontSize: "48px", lineHeight: 1 }}>
              #{position.toLocaleString()}
            </span>
            <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
              founding member
            </span>
          </div>
        ) : null}

        <div className="relative flex flex-col items-center gap-1">
          <span className="text-[12px] text-white/75">Torah-observant matchmaking</span>
          <span className="text-[13px] font-bold text-lime">ahavah.app</span>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Button size="tap" onClick={handleSave}>
          <Download className="size-4" />
          Save image
        </Button>
        {shareReady ? (
          <Button variant="outline" size="tap" onClick={handleShare}>
            <Share2 className="size-4" />
            Share
          </Button>
        ) : null}
        <Button variant="outline" size="tap" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy caption"}
        </Button>
      </div>

      <p className="text-meta text-(--ink-3)">Post it to your story and tag @ahavah.</p>
    </div>
  );
}
