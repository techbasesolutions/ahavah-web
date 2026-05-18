"use client";

import { useEffect, useState } from "react";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";

import { SettingsShell } from "@/components/app/settings-shell";
import { apiClient } from "@/lib/api-client";
import { useShowOnMap } from "@/lib/use-show-on-map";
import { useProfile } from "@/lib/use-profile";

// Backend accepts these fields on PATCH /profile-info as Optional[str]
// with "Yes" / "No" values. Other privacy toggles previously listed on
// this page (showDistance, showLastActive, incognito, readReceipts)
// had no backend equivalent and have been removed rather than left as
// fake controls.
//
// Phase W cutover added `requireVerifiedMatches` (Task 4). The
// "Related" shortcut block (Blocked users + Account & data) was
// removed in Task 10 — those have canonical homes on /settings and
// reachable in one tap.
type BackedKey =
  | "showAge"
  | "showLocation"
  | "hideFromStrangers"
  | "requireVerifiedMatches";

const SERVER_FIELD: Record<BackedKey, string> = {
  showAge: "show_my_age",
  showLocation: "show_my_location",
  hideFromStrangers: "hide_me_from_strangers",
  requireVerifiedMatches: "verification_required",
};

function yesNoToBool(v: unknown): boolean {
  return typeof v === "string" && v.toLowerCase() === "yes";
}

export default function PrivacySettingsPage() {
  // Load current values from GET /profile-info on mount.
  const [toggles, setToggles] = useState<Record<BackedKey, boolean>>({
    showAge: true,
    showLocation: true,
    hideFromStrangers: false,
    requireVerifiedMatches: false,
  });
  const [savingKey, setSavingKey] = useState<BackedKey | null>(null);
  const { value: showOnMap, setValue: setShowOnMapLocal } = useShowOnMap();
  const { update: updateProfile } = useProfile();
  // Fan the toggle out to BOTH localStorage (instant UI feedback) and
  // the server (so the choice survives cache clears + new devices).
  // Server PATCH is fire-and-forget — failures don't block the local
  // toggle since useProfile's update queues a retry on next refresh.
  const setShowOnMap = (next: boolean) => {
    setShowOnMapLocal(next);
    void updateProfile({ showOnMap: next });
  };

  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<Record<string, unknown>>("/profile-info")
      .then((p) => {
        if (cancelled) return;
        setToggles({
          showAge: yesNoToBool(p["show my age"] ?? p.show_my_age),
          // Default TRUE matches the backend column default (init-api.sql:311).
          showLocation:
            "show my location" in p || "show_my_location" in p
              ? yesNoToBool(p["show my location"] ?? p.show_my_location)
              : true,
          hideFromStrangers: yesNoToBool(
            p["hide me from strangers"] ?? p.hide_me_from_strangers,
          ),
          requireVerifiedMatches: yesNoToBool(
            p["verification required"] ?? p.verification_required,
          ),
        });
      })
      .catch(() => {
        // Quiet fail — defaults stay; user can still toggle (PATCH will
        // reflect on next reload).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setBacked = async (key: BackedKey, value: boolean) => {
    if (savingKey) return;
    const prev = toggles[key];
    setToggles((curr) => ({ ...curr, [key]: value }));
    setSavingKey(key);
    try {
      await apiClient.patch("/profile-info", {
        [SERVER_FIELD[key]]: value ? "Yes" : "No",
      });
    } catch {
      // Rollback on failure.
      setToggles((curr) => ({ ...curr, [key]: prev }));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <SettingsShell title="Privacy">
      <div className="flex flex-col gap-6 px-3 pt-4 md:px-0 md:pt-0">
        <section className="flex flex-col gap-2">
          <h2 className="px-3 text-overline text-(--ink-3)">
            Profile visibility
          </h2>
          <ItemGroup className="gap-1">
            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-(--ink)">
                  Show my age
                </ItemTitle>
                <ItemDescription className="text-caption text-(--ink-3)">
                  Display age next to your name on your profile and the
                  swipe deck.
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={toggles.showAge}
                disabled={savingKey === "showAge"}
                onCheckedChange={(checked) => void setBacked("showAge", checked)}
                aria-label="Show my age"
              />
            </Item>

            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-(--ink)">
                  Show me on the map
                </ItemTitle>
                <ItemDescription className="text-caption text-(--ink-3)">
                  Others see your avatar pinned to your country on the
                  discovery map. Turn off to stay hidden.
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={showOnMap}
                onCheckedChange={(checked) => setShowOnMap(checked)}
                aria-label="Show me on the map"
              />
            </Item>

            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-(--ink)">
                  Show my location
                </ItemTitle>
                <ItemDescription className="text-caption text-(--ink-3)">
                  Display your city and country on your profile. Turn off
                  to hide both — peers see only your name and age.
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={toggles.showLocation}
                disabled={savingKey === "showLocation"}
                onCheckedChange={(checked) =>
                  void setBacked("showLocation", checked)
                }
                aria-label="Show my location"
              />
            </Item>

            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-(--ink)">
                  Hide me from strangers
                </ItemTitle>
                <ItemDescription className="text-caption text-(--ink-3)">
                  Only people you&apos;ve liked or messaged can see your
                  full profile. Others see a limited view.
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={toggles.hideFromStrangers}
                disabled={savingKey === "hideFromStrangers"}
                onCheckedChange={(checked) =>
                  void setBacked("hideFromStrangers", checked)
                }
                aria-label="Hide me from strangers"
              />
            </Item>

            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-(--ink)">
                  Require verified matches
                </ItemTitle>
                <ItemDescription className="text-caption text-(--ink-3)">
                  Only show profiles that have completed Bronze, Silver,
                  or Gold verification in your discover feed.
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={toggles.requireVerifiedMatches}
                disabled={savingKey === "requireVerifiedMatches"}
                onCheckedChange={(checked) =>
                  void setBacked("requireVerifiedMatches", checked)
                }
                aria-label="Require verified matches"
              />
            </Item>
          </ItemGroup>
        </section>
      </div>

    </SettingsShell>
  );
}
