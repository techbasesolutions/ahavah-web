"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LocationField } from "@/components/app/location-field";
import { useIsDesktop } from "@/lib/use-is-desktop";

/**
 * "Set your city" nudge for users still sitting on their country-centroid
 * default (citySet === false on /me). Inline banner — same atom family as
 * PushOptInBanner — placed where location matters (map + discover). A banner,
 * not a modal, so it never collides with the push opt-in modal.
 *
 * Tapping "Set city" opens a Sheet with the same `LocationField` used in
 * onboarding; on pick we PATCH the real location + set citySet=true (two
 * PATCHes — the backend enforces one field per request), then hide.
 */
export function CityNudgeBanner() {
  const [citySet, setCitySet] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    let alive = true;
    apiClient
      .get<{ citySet?: boolean }>("/me")
      // Default to TRUE on missing/error so we never nag on a transient failure.
      .then((d) => alive && setCitySet(d.citySet ?? true))
      .catch(() => alive && setCitySet(true));
    return () => {
      alive = false;
    };
  }, []);

  if (citySet !== false) return null;

  const handlePick = async (longFriendly: string) => {
    setSaving(true);
    try {
      await apiClient.patch("/profile-info", { location: longFriendly });
      await apiClient.patch("/profile-info", { ahavah_extra: { citySet: true } });
      setCitySet(true);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        role="region"
        aria-label="Set your city"
        className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-(--card) px-4 py-3 text-body text-(--ink)"
      >
        <div
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lavender/20 text-lavender"
        >
          <MapPin className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-meta font-medium leading-tight text-(--ink)">
            Add your city
          </p>
          <p className="text-caption leading-tight text-(--ink-2)">
            You&apos;re shown at your country&apos;s centre. Set your city so
            people nearby can find you.
          </p>
        </div>
        <Button
          variant="default"
          size="tap"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full"
        >
          Set city
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={isDesktop ? "w-full sm:max-w-md" : "rounded-t-3xl"}
        >
          <SheetHeader className="px-5 pt-6 pb-2">
            <SheetTitle className="text-h2 text-(--ink)">
              Where do you live?
            </SheetTitle>
            <SheetDescription className="text-meta text-(--ink-2)">
              Pick your city so matches nearby can find you.
            </SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-6">
            <LocationField
              id="city-nudge-search"
              label="Your city"
              placeholder="Type your city or town"
              description="Start typing to search. Pick the closest match."
              onSelect={handlePick}
            />
            {saving ? (
              <p className="mt-2 text-caption text-(--ink-2)">Saving…</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
