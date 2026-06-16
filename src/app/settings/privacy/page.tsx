"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { Pill } from "@/components/kibo-ui/pill";
import { Button } from "@/components/ui/button";

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

// showAge / showLocation / hideFromStrangers are Gold-only on the backend:
// PATCH /profile-info returns 403 "Requires gold" for non-gold users. Rather
// than let the optimistic toggle snap back (and read as broken), these rows
// render LOCKED with a "Gold" pill + a path to /verify/gold until the user
// has Gold. requireVerifiedMatches is NOT gated and stays a live toggle.
const GOLD_GATED: Record<BackedKey, boolean> = {
  showAge: true,
  showLocation: true,
  hideFromStrangers: true,
  requireVerifiedMatches: false,
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
  // Gold status drives whether the gated rows render as live toggles or as
  // locked "Gold" rows. Default false until /profile-info resolves so the
  // honest (locked) state shows first and never flickers a dead toggle.
  const [isGold, setIsGold] = useState(false);
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
        // Read gold both ways defensively: `has_gold` (Duolicious boolean tied
        // to the verification ladder) OR `ahavah_verification_tier === "gold"`.
        setIsGold(
          p.has_gold === true || p.ahavah_verification_tier === "gold",
        );
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

  // One row renderer for both the live and Gold-locked states so the three
  // gated rows stay consistent without copy-paste. When `gated && !isGold`
  // the Switch is disabled (read-only current value, no snap-back), a "Gold"
  // pill marks the lock, and the row links to /verify/gold to upgrade.
  // A plain render helper (called, not used as <JSX/>) so it reads the live
  // `isGold` / `toggles` / `savingKey` closure without being a nested
  // component (react-hooks/static-components).
  const renderPrivacyToggle = ({
    settingKey,
    title,
    description,
  }: {
    settingKey: BackedKey;
    title: string;
    description: string;
  }) => {
    const locked = GOLD_GATED[settingKey] && !isGold;
    if (locked) {
      return (
        <Item variant="muted">
          <ItemContent>
            <ItemTitle className="text-meta text-(--ink)">
              {title}
              <Pill variant="lavender" size="sm">
                <Lock aria-hidden />
                Gold
              </Pill>
            </ItemTitle>
            <ItemDescription className="text-caption text-(--ink-3)">
              {description}{" "}
              <Link href="/verify/gold" prefetch={false}>
                Gold members only.
              </Link>
            </ItemDescription>
            <Button
              variant="outlineSubtle"
              size="sm"
              render={<Link href="/verify/gold" prefetch={false} />}
              className="mt-2 self-start"
            >
              Get Gold
            </Button>
          </ItemContent>
          <Switch
            checked={toggles[settingKey]}
            disabled
            aria-label={`${title} (Gold members only)`}
          />
        </Item>
      );
    }
    return (
      <Item variant="muted">
        <ItemContent>
          <ItemTitle className="text-meta text-(--ink)">{title}</ItemTitle>
          <ItemDescription className="text-caption text-(--ink-3)">
            {description}
          </ItemDescription>
        </ItemContent>
        <Switch
          checked={toggles[settingKey]}
          disabled={savingKey === settingKey}
          onCheckedChange={(checked) => void setBacked(settingKey, checked)}
          aria-label={title}
        />
      </Item>
    );
  };

  return (
    <SettingsShell title="Privacy">
      <div className="flex flex-col gap-6 px-3 pt-4 md:px-0 md:pt-0">
        <section className="flex flex-col gap-2">
          <h2 className="px-3 text-overline text-(--ink-3)">
            Profile visibility
          </h2>
          <ItemGroup className="gap-1">
            {renderPrivacyToggle({
              settingKey: "showAge",
              title: "Show my age",
              description:
                "Display age next to your name on your profile and the swipe deck.",
            })}

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

            {renderPrivacyToggle({
              settingKey: "showLocation",
              title: "Show my location",
              description:
                "Display your city and country on your profile. Turn off to hide both. Peers see only your name and age.",
            })}

            {renderPrivacyToggle({
              settingKey: "hideFromStrangers",
              title: "Hide me from strangers",
              description:
                "Only people you've liked or messaged can see your full profile. Others see a limited view.",
            })}

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
