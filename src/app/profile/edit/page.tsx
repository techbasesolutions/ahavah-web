"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  FileText,
  Heart,
  IdCard,
  Image as ImageIcon,
  Shield,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Pill } from "@/components/kibo-ui/pill";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import { useProfile } from "@/lib/use-profile";
import { computeCompleteness } from "@/lib/profile-completeness";

import { PhotoEditSection } from "@/components/profile-edit/section-photos";
import IdentitySection from "@/components/profile-edit/section-identity";
import FaithSection from "@/components/profile-edit/section-faith";
import DoctrineSection from "@/components/profile-edit/section-doctrine";
import LifestyleSection from "@/components/profile-edit/section-lifestyle";
import InterestsSection from "@/components/profile-edit/section-interests";
import PracticalSection from "@/components/profile-edit/section-practical";
import VerificationSection from "@/components/profile-edit/section-verification";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const SECTIONS: ReadonlyArray<{
  id: string;
  label: string;
  Icon: typeof IdCard;
  Component: React.ComponentType;
}> = [
  { id: "photos",       label: "Photos",       Icon: ImageIcon, Component: PhotoEditSection },
  { id: "identity",     label: "Identity",     Icon: IdCard,    Component: IdentitySection },
  { id: "faith",        label: "Faith",        Icon: BookOpen,  Component: FaithSection },
  { id: "doctrine",     label: "Doctrine",     Icon: BookOpen,  Component: DoctrineSection },
  { id: "lifestyle",    label: "Lifestyle",    Icon: Sparkles,  Component: LifestyleSection },
  { id: "interests",    label: "Interests",    Icon: Heart,     Component: InterestsSection },
  { id: "practical",    label: "Practical",    Icon: FileText,  Component: PracticalSection },
  { id: "verification", label: "Verification", Icon: Shield,    Component: VerificationSection },
];

/**
 * /profile/edit — canonical port from
 * `8-New-Desktops/new-desktop-export/desktop-extra.jsx:201`.
 *
 * Desktop (md+): 3-col grid `232px 1fr 320px`:
 *   - LEFT — section nav (anchor links into the scrollable form pane)
 *   - CENTER — form pane (existing PhotoEdit/Identity/Faith/etc. section
 *     components, each wrapped with a scroll-mt anchor target)
 *   - RIGHT — completeness rail: real percent + suggestion list + live
 *     preview link
 *
 * Mobile (<md): the existing single-column vertical stack — section nav
 * collapses, completeness rail moves to top, then sections stack.
 *
 * All form state stays inside the existing section components (they all
 * read + write through `useProfile`). Autosave is unchanged.
 */
const SUGGESTIONS: ReadonlyArray<{ text: string; lift: string }> = [
  { text: "Write a bio — profiles with a bio get 3× more matches.", lift: "+12%" },
  { text: "Add a 6th photo to your gallery.",                       lift: "+4%" },
  { text: "Set your relocation openness.",                          lift: "+5%" },
];

export default function EditProfilePage() {
  const { profile } = useProfile();
  const completeness = computeCompleteness(profile);
  const requiredMissing =
    completeness.requiredTotal - completeness.requiredFilled;

  return (
    <PageShell
      bottomPad="nav"
      desktopShell="sidebar"
      topBarTitle="Edit profile"
      topBarActions={
        <div className="hidden md:flex items-center gap-2.5">
          <Pill variant="lime" size="sm">
            <Check className="size-3" strokeWidth={3} />
            All changes saved
          </Pill>
          <Button
            size="tap"
            tone="cta"
            render={<Link href="/profile" prefetch={false} />}
          >
            Done
          </Button>
        </div>
      }
    >
      {/* ── Mobile header ───────────────────────────────────────────── */}
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Back to profile"
          render={<Link href="/profile" prefetch={false} />}
          className="bg-card border-(--hairline) text-(--ink)"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeaderTitle>Edit profile</PageHeaderTitle>
      </PageHeader>

      {/* ── Mobile body (existing single-column stack) ──────────────── */}
      <div className="md:hidden flex flex-col gap-8 px-5 pt-4">
        <motion.div {...fadeUp} transition={{ duration: 0.25 }}>
          <Card tone="default" className="rounded-2xl px-5 py-4">
            <CardContent className="flex flex-col gap-2 p-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-h3 text-(--ink) tabular-nums">
                  {completeness.percent}% complete
                </span>
                <span
                  className={
                    requiredMissing > 0
                      ? "text-meta text-pink"
                      : "text-meta text-lime"
                  }
                >
                  {requiredMissing > 0
                    ? `${requiredMissing} required missing`
                    : "All required filled"}
                </span>
              </div>
              <Progress
                value={completeness.percent}
                aria-label="Profile completeness"
              />
            </CardContent>
          </Card>
        </motion.div>

        {SECTIONS.map((s, i) => (
          <motion.div
            key={s.id}
            {...fadeUp}
            transition={{ duration: 0.25, delay: 0.04 + i * 0.04 }}
          >
            <s.Component />
          </motion.div>
        ))}

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.4 }}
          className="flex flex-col gap-1"
        >
          <Button
            size="cta"
            tone="cta"
            className="w-full"
            render={<Link href="/profile" prefetch={false} />}
          >
            Done
          </Button>
          <p className="text-center text-caption text-(--ink-3)">
            Changes save automatically as you edit.
          </p>
        </motion.div>
      </div>

      {/* ── Desktop 3-col body ─────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[232px_1fr_320px] gap-6 px-8 pt-6 pb-8 flex-1 min-h-0">
        {/* LEFT — section nav (anchor links) */}
        <nav
          aria-label="Profile sections"
          className="flex flex-col gap-1.5 self-start"
        >
          <p className="px-3 pb-2 text-overline text-(--ink-2)">Sections</p>
          <ItemGroup className="gap-1">
            {SECTIONS.map(({ id, label, Icon }) => (
              <Item
                key={id}
                variant="muted"
                size="sm"
                render={<a href={`#section-${id}`} aria-label={label} />}
              >
                <ItemMedia variant="icon">
                  <Icon className="size-3.5" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta font-medium text-(--ink)">
                    {label}
                  </ItemTitle>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </nav>

        {/* CENTER — scrollable form pane */}
        <div className="flex flex-col gap-6 overflow-y-auto min-h-0 pr-2">
          {SECTIONS.map(({ id, Component }) => (
            <section
              key={id}
              id={`section-${id}`}
              className="scroll-mt-6"
            >
              <Component />
            </section>
          ))}

          {/* Danger zone */}
          <Card
            tone="default"
            className="border border-pink/30 bg-pink/5"
          >
            <CardContent className="flex items-center gap-3 p-5">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pink/20 text-pink"
              >
                <AlertTriangle className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-meta font-bold text-(--ink) m-0">
                  Danger zone
                </p>
                <p className="text-caption text-(--ink-3) m-0">
                  Hide profile from discovery, deactivate, or permanently
                  delete.
                </p>
              </div>
              <Button
                variant="outline"
                size="tap"
                render={
                  <Link href="/settings/account" prefetch={false} />
                }
              >
                Manage
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — completeness rail */}
        <aside className="flex flex-col gap-4 self-start">
          <Card tone="default">
            <CardContent className="p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-h2 text-(--ink) tabular-nums">
                  {completeness.percent}%
                </span>
                {requiredMissing > 0 ? (
                  <Pill variant="pink" size="sm">
                    {requiredMissing} required
                  </Pill>
                ) : (
                  <Pill variant="lime" size="sm">
                    All filled
                  </Pill>
                )}
              </div>
              <p className="text-caption text-(--ink-3) mt-0.5 m-0">
                Profile completeness
              </p>
              <Progress
                value={completeness.percent}
                aria-label="Profile completeness"
                className="mt-3.5"
              />
              {requiredMissing > 0 ? (
                <div className="mt-3 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-pink/10">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-pink/20 text-pink"
                  >
                    <AlertTriangle className="size-3.5" />
                  </span>
                  <p className="text-caption leading-relaxed text-(--ink-2) m-0">
                    <span className="font-bold text-(--ink)">
                      {requiredMissing} required field
                      {requiredMissing === 1 ? "" : "s"}
                    </span>{" "}
                    missing.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card tone="default">
            <CardContent className="p-5">
              <p className="text-overline text-(--ink-2) mb-2.5 m-0">
                Suggestions
              </p>
              <ItemGroup className="gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <Item key={i} variant="muted" size="sm">
                    <ItemMedia variant="icon">
                      <span className="text-overline font-extrabold text-(--ink-2)">
                        {i + 1}
                      </span>
                    </ItemMedia>
                    <ItemContent>
                      <ItemDescription className="text-meta text-(--ink) leading-snug">
                        {s.text}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Pill variant="lime" size="sm">
                        {s.lift}
                      </Pill>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            </CardContent>
          </Card>

          <Card tone="default">
            <CardContent className="p-2">
              <Item
                variant="muted"
                render={
                  <Link
                    href="/profile"
                    prefetch={false}
                    aria-label="Open live preview"
                  />
                }
              >
                <ItemMedia variant="icon">
                  <Eye className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta font-semibold text-(--ink)">
                    Live preview
                  </ItemTitle>
                  <ItemDescription className="text-caption text-(--ink-3)">
                    See how others view you
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight
                    aria-hidden
                    className="size-3.5 text-(--ink-3)"
                  />
                </ItemActions>
              </Item>
            </CardContent>
          </Card>
        </aside>
      </div>

      <BottomNav />
    </PageShell>
  );
}
