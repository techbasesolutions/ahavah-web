"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Item,
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

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type ToggleKey =
  | "pushAll"
  | "newMatches"
  | "newMessages"
  | "messageReactions"
  | "likes"
  | "profileVisits"
  | "marketing"
  | "weeklySummary";

const TOGGLE_GROUPS: ReadonlyArray<{
  label: string;
  items: ReadonlyArray<{
    key: ToggleKey;
    title: string;
    description: string;
  }>;
}> = [
  {
    label: "Push notifications",
    items: [
      { key: "pushAll",          title: "All push notifications", description: "Master switch for everything below" },
      { key: "newMatches",       title: "New matches",            description: "Someone you liked liked you back" },
      { key: "newMessages",      title: "New messages",           description: "When someone messages you" },
      { key: "messageReactions", title: "Message reactions",      description: "Likes and replies on your messages" },
      { key: "likes",            title: "Likes",                  description: "When someone likes your profile" },
      { key: "profileVisits",    title: "Profile visits",         description: "When someone views your profile" },
    ],
  },
  {
    label: "Email",
    items: [
      { key: "marketing",     title: "Product updates",  description: "New features and tips for matches" },
      { key: "weeklySummary", title: "Weekly summary",   description: "What you missed this week" },
    ],
  },
];

const DEFAULTS: Record<ToggleKey, boolean> = {
  pushAll:          true,
  newMatches:       true,
  newMessages:      true,
  messageReactions: true,
  likes:            true,
  profileVisits:    false,
  marketing:        false,
  weeklySummary:    true,
};

export default function NotificationsSettingsPage() {
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
        <PageHeaderTitle>Notifications</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        {TOGGLE_GROUPS.map((group, gi) => (
          <motion.section
            key={group.label}
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.05 + gi * 0.08 }}
            className="flex flex-col gap-2"
          >
            <h2 className="px-3 text-overline text-text-muted">{group.label}</h2>
            <ItemGroup className="gap-1">
              {group.items.map((item) => {
                const isMaster = item.key === "pushAll";
                const masterOff = !isMaster && !toggles.pushAll;
                return (
                  <Item key={item.key} variant="muted">
                    <ItemContent>
                      <ItemTitle className="text-meta text-white">
                        {item.title}
                      </ItemTitle>
                      <ItemDescription className="text-caption text-text-muted">
                        {item.description}
                      </ItemDescription>
                    </ItemContent>
                    <Switch
                      checked={toggles[item.key]}
                      disabled={masterOff && group.label === "Push notifications"}
                      onCheckedChange={(checked) => set(item.key, checked)}
                      aria-label={item.title}
                    />
                  </Item>
                );
              })}
            </ItemGroup>
          </motion.section>
        ))}
      </div>

      <BottomNav />
    </PageShell>
  );
}
