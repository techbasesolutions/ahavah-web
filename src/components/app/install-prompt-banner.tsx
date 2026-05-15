"use client";

import { useState } from "react";
import { Download, Plus, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useInstallPrompt } from "@/lib/use-install-prompt";

/**
 * Soft prompt to install Ahavah as a PWA. Same shape as
 * PushOptInBanner so the two stack cleanly when both are eligible.
 *
 * Hidden when the app is already installed, the browser doesn't
 * support a2hs, or the user dismissed within the last 14 days.
 *
 * Two flavours:
 *   - Android (state="ready"): tap "Install" → fires the deferred
 *     `beforeinstallprompt` dialog. One tap → installed.
 *   - iOS (state="ios"): tap "How to install" → opens a Sheet with
 *     "tap Share → Add to Home Screen" instructions, since iOS Safari
 *     doesn't expose a programmatic install API.
 *
 * Why install on iOS first: web-push notifications on iOS only work
 * AFTER the PWA is installed to the home screen. The install banner
 * is therefore a prerequisite for push to work at all on iOS.
 */
export function InstallPromptBanner() {
  const { state, promptInstall, dismiss } = useInstallPrompt();
  const [iosSheetOpen, setIosSheetOpen] = useState(false);

  if (state === "unavailable" || state === "installed" || state === "dismissed") {
    return null;
  }

  const isIos = state === "ios";

  return (
    <>
      <div
        role="region"
        aria-label="Install Ahavah"
        className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-bg-elevated px-4 py-3 text-body text-white"
      >
        <div
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime"
        >
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-meta font-medium leading-tight text-white">
            Install Ahavah on your home screen
          </p>
          <p className="text-caption leading-tight text-text-secondary">
            {isIos
              ? "Required on iPhone for notifications to work."
              : "One tap. Works offline. Faster than the browser."}
          </p>
        </div>
        <Button
          variant="default"
          size="tap"
          onClick={() => {
            if (isIos) {
              setIosSheetOpen(true);
            } else {
              void promptInstall();
            }
          }}
          className="shrink-0 rounded-full"
        >
          {isIos ? "How" : "Install"}
        </Button>
        <Button
          variant="ghost"
          size="icon-tap"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="shrink-0 rounded-full text-text-secondary"
        >
          <X aria-hidden />
        </Button>
      </div>

      <Sheet open={iosSheetOpen} onOpenChange={setIosSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl bg-bg-canvas text-white"
        >
          <SheetHeader>
            <SheetTitle className="text-h2 text-white">
              Add Ahavah to your home screen
            </SheetTitle>
            <SheetDescription className="text-meta text-text-secondary">
              iPhone Safari doesn&apos;t install apps automatically. Three
              taps and you&apos;re done.
            </SheetDescription>
          </SheetHeader>

          <ol className="mx-4 mt-2 mb-6 flex flex-col gap-4">
            <li className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lavender/20 text-lavender"
              >
                <Share className="size-4" />
              </span>
              <span className="flex-1 text-body leading-relaxed">
                <span className="font-medium text-white">
                  1. Tap the Share icon
                </span>
                <span className="block text-caption text-text-secondary">
                  At the bottom of Safari (square with an upward arrow).
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lavender/20 text-lavender"
              >
                <Plus className="size-4" />
              </span>
              <span className="flex-1 text-body leading-relaxed">
                <span className="font-medium text-white">
                  2. Choose &ldquo;Add to Home Screen&rdquo;
                </span>
                <span className="block text-caption text-text-secondary">
                  Scroll down in the share sheet if you don&apos;t see it.
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime"
              >
                <Download className="size-4" />
              </span>
              <span className="flex-1 text-body leading-relaxed">
                <span className="font-medium text-white">
                  3. Tap &ldquo;Add&rdquo;
                </span>
                <span className="block text-caption text-text-secondary">
                  Ahavah lands on your home screen. Open it from there
                  and notifications will work.
                </span>
              </span>
            </li>
          </ol>
        </SheetContent>
      </Sheet>
    </>
  );
}
