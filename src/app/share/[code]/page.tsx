"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const CROCKFORD_BASE32 = /^[0-9A-HJKM-NP-TV-Z]{7}$/;

export default function SharePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void params.then(({ code }) => {
      const normalized = (code || "").toUpperCase();
      if (CROCKFORD_BASE32.test(normalized)) setCode(normalized);
    });
  }, [params]);

  if (!code) {
    return (
      <main className="min-h-dvh grid place-items-center p-6 text-(--ink-2)">
        <p className="text-body">That link isn’t valid.</p>
      </main>
    );
  }

  const inviteUrl = `https://ahavah.app/i/${code}`;
  const shareText =
    "I’m on the Ahavah beta | Torah-observant matchmaking for serious believers. Use my link to join the beta: ";

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Join me on Ahavah",
          text: shareText,
          url: inviteUrl,
        });
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-dvh bg-(--app) grid place-items-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-5 text-center">
        <h1 className="text-display text-(--ink)">
          Your invite link<span className="text-(--color-lime)">.</span>
        </h1>
        <p className="text-body text-(--ink-2)">
          Tap below to share it via Messages, WhatsApp, or anywhere else.
        </p>
        <code className="block break-all rounded-2xl bg-(--card) p-4 text-meta text-(--ink) ring-1 ring-(--hairline)">
          {inviteUrl}
        </code>
        <Button size="cta" tone="cta" className="w-full" onClick={handleShare}>
          {copied ? (
            <>
              <Check />
              Copied
            </>
          ) : (
            <>
              <Share2 />
              Share your link
            </>
          )}
        </Button>
      </div>
    </main>
  );
}
