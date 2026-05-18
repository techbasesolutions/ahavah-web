"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ChevronRight, CreditCard, Loader2, LogOut, RotateCcw, Settings,
  ShieldCheck, Sparkles, TriangleAlert, UserPen,
} from "lucide-react";

import { apiClient, ApiError } from "@/lib/api-client";
import { isPremium } from "@/lib/profile-schema";
import { computeCompleteness } from "@/lib/profile-completeness";
import { useProfile } from "@/lib/use-profile";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconBadge } from "@/components/ui/icon-badge";
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
import { BoostCard } from "@/components/app/boost-card";
import { PageShell } from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// /profile is identity-only: hero card + 4 drill-down rows + a single
// inline Sign-out section at the bottom. NO Log out / Delete account
// nav-rows that redirect to /settings/account — that was a three-tap
// log-out, plus the same duplication for delete. Delete account now
// lives only at Profile → Settings → Account (3 deliberate steps —
// appropriate friction for an irreversible action).
type ProfileLink = {
  Icon: typeof UserPen;
  title: string;
  subtitle?: string;
  href: string;
  tone: "brand" | "success" | "muted";
};

export default function ProfilePage() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useProfile();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Phase W cutover (2026-05-15) — cancel-deletion self-service. The
  // billing portal flow uses a dedicated /billing-portal redirect page
  // (handles its own busy/error state) so it doesn't need state here.
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Real values from useProfile (cache + /me + /profile-info). The hero
  // card previously hardcoded 'Ehud, 30' and 'Bronze verified' — those
  // never updated. Defaults below cover the brief mount-before-fetch
  // window without showing someone else's name.
  const firstName = profile.firstName ?? "";
  // displayName is an optional preferred-name field stored in
  // ahavah_extra. When set + distinct from firstName, prefer it for
  // the hero so users see what others see (peer profile uses it too).
  const displayName =
    typeof profile.displayName === "string" && profile.displayName.length > 0
      ? profile.displayName
      : null;
  const heroName =
    displayName && displayName.toLowerCase() !== firstName.toLowerCase()
      ? displayName
      : firstName;
  const age = typeof profile.age === "number" && profile.age > 0 ? profile.age : null;
  const initial = (heroName || firstName || "•")[0].toUpperCase();
  // Primary photo for the hero avatar — first uploaded photo with a
  // resolved cdn_url. Falls back to the initial when no photos exist
  // (covers the brief signup → /onboarding/photos window).
  const primaryPhotoUrl = profile.photos?.find(
    (p) => p && p.cdn_url && p.cdn_url.length > 0,
  )?.cdn_url;
  // Two backend signals (mig 0003 + 0012): legacy 'verification level'
  // string ("No verification" / "Photos" / "Photos + ID") AND the new
  // 'ahavah_verification_tier' ENUM ('none'|'bronze'|'silver'|'gold').
  // Silver only exists on the new ENUM (the legacy column has no slot
  // for it), so we prefer the ENUM for label + subtitle and fall back
  // to the legacy string only when the ENUM is absent.
  const profileRaw = profile as Record<string, unknown>;
  const verificationLevelRaw = profileRaw["verification level"];
  const userTier =
    typeof profileRaw.ahavah_verification_tier === "string"
      ? profileRaw.ahavah_verification_tier
      : "none";
  const tierLabel =
    userTier === "gold"
      ? "Gold verified"
      : userTier === "silver"
        ? "Silver verified"
        : userTier === "bronze"
          ? "Bronze verified"
          : null;
  // Show the Pill only when the user has cleared at least the lowest
  // tier. Prefer the new tier label; fall back to the legacy string.
  const verificationLevel =
    tierLabel ??
    (typeof verificationLevelRaw === "string" && verificationLevelRaw !== "No verification"
      ? verificationLevelRaw
      : null);

  // Build the row list at render time so the Verification + Subscription
  // subtitles reflect ACTUAL state instead of hardcoded copy.
  const verifySubtitle =
    userTier === "gold"
      ? "Gold · highest trust"
      : userTier === "silver"
        ? "Silver · upgrade to Gold"
        : userTier === "bronze"
          ? "Bronze · upgrade to Silver"
          : verificationLevelRaw === "Photos + ID"
            ? "Gold · highest trust"
            : verificationLevelRaw === "Photos"
              ? "Bronze · upgrade to Silver"
              : "Verify your identity";
  // Premium gate (Phase W cutover, 2026-05-15) — drives both copy and
  // destination of the Subscription row. isPremium reads
  // profile.entitlements (the canonical source). Premium users land on
  // /billing-portal which redirects to Stripe's hosted portal; free
  // users land on the in-app paywall to start a checkout.
  const premium = isPremium(profile);
  const subscriptionSubtitle = premium
    ? "Premium · manage subscription"
    : "Upgrade to Premium →";
  const subscriptionHref = premium ? "/billing-portal" : "/paywall";
  const PROFILE_LINKS: ReadonlyArray<ProfileLink> = [
    { Icon: UserPen,     title: "Edit profile", subtitle: "Photos, bio, basics",             href: "/profile/edit", tone: "brand" },
    { Icon: ShieldCheck, title: "Verification", subtitle: verifySubtitle,                    href: "/verify",       tone: "success" },
    { Icon: CreditCard,  title: "Subscription", subtitle: subscriptionSubtitle,              href: subscriptionHref, tone: "success" },
    { Icon: Settings,    title: "Settings",     subtitle: "Notifications, privacy, account", href: "/settings",     tone: "muted" },
  ];

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    // signOut() is best-effort: even if the server call fails the local
    // cache + state is cleared, so we always navigate away.
    await signOut();
    router.push("/");
  };

  // Phase W cutover (2026-05-15) — soft-delete cancel handler.
  // Counterpart to /settings/account "Delete account" → /account
  // (which sets activated=FALSE + stamps deletion_requested_at).
  // Without this surface, the only way to undo was emailing
  // admin@ahavah.app — a mailbox that doesn't exist yet.
  const deletionRequestedAt = profile.deletionRequestedAt;
  const handleCancelDeletion = async () => {
    if (restoreBusy) return;
    setRestoreBusy(true);
    setRestoreError(null);
    try {
      await apiClient.post("/account/cancel-deletion", {});
      // refreshProfile clears deletionRequestedAt on the next fetch,
      // which makes this banner disappear.
      await refreshProfile();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message || "Couldn't cancel deletion."
          : "Couldn't reach the server.";
      setRestoreError(msg);
      setRestoreBusy(false);
    }
  };

  // ── Shared JSX fragments ─────────────────────────────────────────────
  // Defined once, reused in both mobile and desktop slots.

  const deletionBanner = deletionRequestedAt ? (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-(--color-pink)/40 bg-(--color-pink)/10 p-4 text-body text-(--ink)"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert aria-hidden className="size-5 shrink-0 text-pink" />
        <div className="flex-1 min-w-0">
          <p className="text-meta font-medium leading-tight">
            Your account is scheduled for deletion
          </p>
          <p className="text-caption leading-tight text-(--ink-2)">
            Cancel within 7 days of {formatDeletionDate(deletionRequestedAt)} to keep your profile.
          </p>
        </div>
      </div>
      <Button
        variant="default"
        size="tap"
        disabled={restoreBusy}
        onClick={() => void handleCancelDeletion()}
        className="w-full rounded-full"
      >
        <RotateCcw aria-hidden />
        {restoreBusy ? "Restoring…" : "Cancel deletion"}
      </Button>
      {restoreError ? (
        <p className="text-caption text-pink">{restoreError}</p>
      ) : null}
    </div>
  ) : null;

  const signOutDialog = (
    <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-center"
          >
            <LogOut size={16} className="mr-2" />
            Sign out
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign out of Ahavah?</DialogTitle>
          <DialogDescription>
            You&apos;ll need to sign back in to see your matches and messages.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" size="lg">Cancel</Button>}
          />
          <Button
            size="lg"
            tone="brand"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing out...
              </>
            ) : (
              "Sign out"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <PageShell bottomPad="nav" desktopShell="sidebar" topBarTitle="Profile">
      {/* ── Mobile layout (hidden at md+) ─────────────────────────────── */}
      <div className="md:hidden">
        {/* Soft-delete grace banner */}
        {deletionRequestedAt ? (
          <div className="px-5 pt-4">{deletionBanner}</div>
        ) : null}

        {/* Hero card — own profile + free badge + Upgrade CTA */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4 }}
          className="px-5 pt-6"
        >
          <Card tone="gradient" className="overflow-hidden gap-0 py-0">
            <CardHeader className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-4">
                <Avatar
                  size="tap-2xl"
                  aria-label="Your profile"
                  className="ring-2 ring-white/40"
                >
                  {primaryPhotoUrl ? (
                    <AvatarImage src={primaryPhotoUrl} alt={firstName || "Your photo"} />
                  ) : null}
                  <AvatarFallback variant="brand">{initial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-h1 leading-tight text-(--ink)">
                    {heroName || "Your profile"}
                    {age ? `, ${age}` : ""}
                  </h1>
                  {displayName &&
                  displayName.toLowerCase() !== firstName.toLowerCase() &&
                  firstName ? (
                    <p className="text-caption leading-tight text-(--ink-2)">
                      {firstName}
                    </p>
                  ) : null}
                  {verificationLevel ? (
                    <Pill variant="glassDark" className="mt-2">
                      <ShieldCheck size={12} />
                      {verificationLevel}
                    </Pill>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            {!premium && (
              <CardContent className="px-5 pb-5">
                <Button
                  nativeButton={false}
                  size="cta"
                  tone="cta"
                  render={<Link href="/paywall" prefetch={false} />}
                >
                  <Sparkles size={14} className="mr-2" />
                  Upgrade to Premium
                </Button>
              </CardContent>
            )}
          </Card>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.04 }}
          className="px-5 pt-4"
        >
          <BoostCard />
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="px-3 pt-8"
        >
          <ItemGroup className="gap-1">
            {PROFILE_LINKS.map((item) => (
              <Item
                key={item.title}
                variant="muted"
                render={
                  <Link href={item.href} prefetch={false} className="rounded-2xl" />
                }
              >
                <ItemMedia>
                  <IconBadge tone={item.tone}>
                    <item.Icon />
                  </IconBadge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta text-(--ink)">{item.title}</ItemTitle>
                  {item.subtitle ? (
                    <ItemDescription className="text-caption text-(--ink-3)">
                      {item.subtitle}
                    </ItemDescription>
                  ) : null}
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4 text-(--ink-3)" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="px-5 pt-6 pb-2"
        >
          {signOutDialog}
        </motion.div>

        <BottomNav />
      </div>

      {/* ── Desktop layout (hidden below md) ─────────────────────────── */}
      <div className="hidden md:grid md:grid-cols-[480px_1fr] md:gap-8 md:max-w-295 md:mx-auto md:w-full">
        {/* Left column: hero card + completeness card */}
        <div className="flex flex-col gap-6">
          {deletionRequestedAt ? deletionBanner : null}

          {/* Hero card — gradient matches Card tone="gradient" (indigo→lavender).
              bg-[] arbitrary value used because linear-gradient cannot be expressed
              as a static Tailwind class; this is the only inline-style equivalent. */}
          <div
            className="flex flex-col gap-5 rounded-3xl p-7 text-white bg-[linear-gradient(135deg,#5524F5_0%,#9F76EA_70%,#BC96FF_100%)]"
          >
            <div className="flex items-center gap-4">
              <Avatar
                size="tap-2xl"
                aria-label="Your profile"
                className="ring-[3px] ring-white/40"
              >
                {primaryPhotoUrl ? (
                  <AvatarImage src={primaryPhotoUrl} alt={firstName || "Your photo"} />
                ) : null}
                <AvatarFallback variant="brand">{initial}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-h1 leading-tight text-white">
                  {heroName || "Your profile"}
                  {age ? `, ${age}` : ""}
                </h2>
                {verificationLevel ? (
                  <Pill variant="glassDark" className="mt-2">
                    <ShieldCheck size={12} />
                    {verificationLevel}
                  </Pill>
                ) : null}
              </div>
            </div>
            {!premium && (
              <Button
                nativeButton={false}
                size="cta"
                tone="cta"
                render={<Link href="/paywall" prefetch={false} />}
              >
                <Sparkles size={14} className="mr-2" />
                Upgrade to Premium
              </Button>
            )}
          </div>

          {/* Boost card — post-canonical monetization (2026-05-16 sprint),
              positioned between Hero and Completeness per the sprint
              integration brief. */}
          <BoostCard />

          {/* Profile completeness card — canonical screens/10-profile.md
              §Completeness. Theme-aware tokens throughout. */}
          {profile ? (
            (() => {
              const completeness = computeCompleteness(profile);
              const percent = completeness.percent;
              const remainingFields =
                completeness.requiredTotal - completeness.requiredFilled;
              const hint =
                percent >= 100
                  ? "Your profile is complete."
                  : remainingFields > 0
                  ? `${remainingFields} field${remainingFields === 1 ? "" : "s"} to fill to reach the discover threshold.`
                  : "Add more details (photos, bio) to reach 100%.";
              return (
                <div className="rounded-[18px] p-5 border border-(--hairline) bg-(--card)">
                  <div className="flex items-center justify-between">
                    <p className="text-meta font-semibold text-(--ink)">
                      Profile completeness
                    </p>
                    <p className="text-meta font-bold text-(--color-lime) tabular-nums">
                      {percent}%
                    </p>
                  </div>
                  {/* Kit Progress primitive — handles ARIA semantics
                      internally (role=progressbar + valuenow/min/max),
                      avoiding the jsx-a11y lint rule that rejects
                      expression-valued ARIA attrs on a raw <div>. */}
                  <Progress
                    value={percent}
                    aria-label="Profile completeness"
                    className="mt-2.5 h-2 bg-(--hairline) [&>[data-slot=progress-indicator]]:bg-(--color-lime)"
                  />
                  <p className="mt-2 text-caption text-(--ink-3)">{hint}</p>
                </div>
              );
            })()
          ) : null}
        </div>

        {/* Right column: action rows + sign out */}
        <div className="flex flex-col gap-4">
          <ItemGroup className="gap-2">
            {PROFILE_LINKS.map((item) => (
              <Item
                key={item.title}
                variant="muted"
                render={
                  <Link href={item.href} prefetch={false} className="rounded-2xl" />
                }
                className="rounded-[18px] border border-(--hairline,rgba(15,11,31,0.06)) bg-(--card,#fff) px-6 py-5.5 gap-4.5"
              >
                <ItemMedia>
                  <IconBadge tone={item.tone}>
                    <item.Icon />
                  </IconBadge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta font-semibold text-(--ink,#0F0B1F)">
                    {item.title}
                  </ItemTitle>
                  {item.subtitle ? (
                    <ItemDescription className="text-caption text-(--ink-3,oklch(0.60_0.04_280))">
                      {item.subtitle}
                    </ItemDescription>
                  ) : null}
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4 text-(--ink-3,oklch(0.60_0.04_280))" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>

          <div className="mt-2">{signOutDialog}</div>
        </div>
      </div>
    </PageShell>
  );
}

/** Format a deletion-requested ISO 8601 stamp for the grace banner.
 *  Returns "Mar 12, 2026" style (locale-aware fallback to ISO date if
 *  Intl is missing). Used only for cosmetic display; no timezone math
 *  beyond what the runtime defaults to. */
function formatDeletionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}
