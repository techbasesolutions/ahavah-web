"use client";

import { useState } from "react";
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
import { Pill } from "@/components/kibo-ui/pill";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type ToggleKey =
  | "showAge"
  | "showDistance"
  | "showLastActive"
  | "incognito"
  | "readReceipts"
  | "limitWhoCanMessage"
  | "shareLocationOnMap";

const PRIVACY_GROUPS: ReadonlyArray<{
  label: string;
  description?: string;
  items: ReadonlyArray<{
    key: ToggleKey;
    title: string;
    description: string;
    premium?: boolean;
  }>;
}> = [
  {
    label: "Profile visibility",
    description: "Control what other people see on your profile.",
    items: [
      { key: "showAge",         title: "Show my age",         description: "Display age next to your name" },
      { key: "showDistance",    title: "Show distance",       description: "Show how far you are from matches" },
      { key: "showLastActive",  title: "Show last active",    description: '"Online now" / "Active 2h ago"' },
    ],
  },
  {
    label: "Browsing",
    items: [
      { key: "incognito",          title: "Incognito mode",       description: "Browse without appearing in their swipe deck", premium: true },
      { key: "readReceipts",       title: "Read receipts",        description: "Send and receive read indicators" },
      { key: "limitWhoCanMessage", title: "Verified-only messages", description: "Only verified users can message you", premium: true },
      { key: "shareLocationOnMap", title: "Share live location",  description: "Approximate city only, never exact" },
    ],
  },
];

const DEFAULTS: Record<ToggleKey, boolean> = {
  showAge:             true,
  showDistance:        true,
  showLastActive:      false,
  incognito:           false,
  readReceipts:        true,
  limitWhoCanMessage:  false,
  shareLocationOnMap:  true,
};

const SHORTCUT_LINKS: ReadonlyArray<{
  title: string;
  subtitle: string;
  href: string;
}> = [
  { title: "Blocked users",    subtitle: "Manage people you've blocked", href: "/settings/blocked" },
  { title: "Account & data",   subtitle: "Email, phone, account deletion", href: "/settings/account" },
];

export default function PrivacySettingsPage() {
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>(DEFAULTS);

  const set = (key: ToggleKey, value: boolean) =>
    setToggles((prev) => ({ ...prev, [key]: value }));

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
        {PRIVACY_GROUPS.map((group, gi) => (
          <motion.section
            key={group.label}
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.05 + gi * 0.08 }}
            className="flex flex-col gap-2"
          >
            <h2 className="px-3 text-overline text-text-muted">{group.label}</h2>
            {group.description ? (
              <p className="px-3 text-caption text-text-muted">
                {group.description}
              </p>
            ) : null}
            <ItemGroup className="gap-1">
              {group.items.map((item) => (
                <Item key={item.key} variant="muted">
                  <ItemContent>
                    <ItemTitle className="flex items-center gap-2 text-meta text-white">
                      {item.title}
                      {item.premium ? (
                        <Pill variant="lime" className="text-caption font-semibold">
                          Premium
                        </Pill>
                      ) : null}
                    </ItemTitle>
                    <ItemDescription className="text-caption text-text-muted">
                      {item.description}
                    </ItemDescription>
                  </ItemContent>
                  <Switch
                    checked={toggles[item.key]}
                    onCheckedChange={(checked) => set(item.key, checked)}
                    aria-label={item.title}
                  />
                </Item>
              ))}
            </ItemGroup>
          </motion.section>
        ))}

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 + PRIVACY_GROUPS.length * 0.08 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Shortcuts</h2>
          <ItemGroup className="gap-1">
            {SHORTCUT_LINKS.map((link) => (
              <Item
                key={link.href + link.title}
                variant="muted"
                render={
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="rounded-2xl"
                  />
                }
              >
                <ItemContent>
                  <ItemTitle className="text-meta text-white">
                    {link.title}
                  </ItemTitle>
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
