"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { apiClient } from "@/lib/api-client";
import { useShowOnMap } from "@/lib/use-show-on-map";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Backend accepts these fields on PATCH /profile-info as Optional[str]
// with "Yes" / "No" values. Other privacy toggles previously listed on
// this page (showDistance, showLastActive, incognito, readReceipts,
// shareLocationOnMap) had no backend equivalent and have been removed
// rather than left as fake controls.
type BackedKey = "showAge" | "hideFromStrangers";

const SERVER_FIELD: Record<BackedKey, string> = {
  showAge: "show_my_age",
  hideFromStrangers: "hide_me_from_strangers",
};

const SHORTCUT_LINKS: ReadonlyArray<{
  title: string;
  subtitle: string;
  href: string;
}> = [
  { title: "Blocked users",  subtitle: "Manage people you've blocked",   href: "/settings/blocked" },
  { title: "Account & data", subtitle: "Email, account deletion",        href: "/settings/account" },
];

function yesNoToBool(v: unknown): boolean {
  return typeof v === "string" && v.toLowerCase() === "yes";
}

export default function PrivacySettingsPage() {
  // Load current values from GET /profile-info on mount.
  const [toggles, setToggles] = useState<Record<BackedKey, boolean>>({
    showAge: true,
    hideFromStrangers: false,
  });
  const [savingKey, setSavingKey] = useState<BackedKey | null>(null);
  const { value: showOnMap, setValue: setShowOnMap } = useShowOnMap();

  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<Record<string, unknown>>("/profile-info")
      .then((p) => {
        if (cancelled) return;
        setToggles({
          showAge: yesNoToBool(p["show my age"] ?? p.show_my_age),
          hideFromStrangers: yesNoToBool(
            p["hide me from strangers"] ?? p.hide_me_from_strangers,
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
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to settings"
          render={<Link href="/settings" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Privacy</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Profile visibility</h2>
          <ItemGroup className="gap-1">
            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-white">Show my age</ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
                  Display age next to your name on your profile and the swipe deck.
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
                <ItemTitle className="text-meta text-white">
                  Show me on the map
                </ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
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
                <ItemTitle className="text-meta text-white">
                  Hide me from strangers
                </ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
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
          </ItemGroup>
        </motion.section>

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.13 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Related</h2>
          <ItemGroup className="gap-1">
            {SHORTCUT_LINKS.map((link) => (
              <Item
                key={link.title}
                variant="muted"
                render={<Link href={link.href} prefetch={false} className="rounded-2xl" />}
              >
                <ItemContent>
                  <ItemTitle className="text-meta text-white">{link.title}</ItemTitle>
                  <ItemDescription className="text-caption text-text-muted">
                    {link.subtitle}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4 text-text-muted" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </motion.section>
      </div>

      <BottomNav />
    </PageShell>
  );
}
