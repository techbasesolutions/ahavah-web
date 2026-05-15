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
import { useProfile } from "@/lib/use-profile";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  // /profile-info returns 'verification level' (space-separated key) as
  // the human-readable string ('No verification', 'Photos', 'Photos + ID').
  // Show the Pill only when the user has cleared at least the lowest tier.
  const verificationLevelRaw = (profile as Record<string, unknown>)["verification level"];
  const verificationLevel =
    typeof verificationLevelRaw === "string" && verificationLevelRaw !== "No verification"
      ? verificationLevelRaw
      : null;

  // Build the row list at render time so the Verification + Subscription
  // subtitles reflect ACTUAL state instead of hardcoded copy. Backend
  // ships 'verification level' ("No verification" / "Photos" / "Photos + ID")
  // and `has_gold` (boolean premium flag).
  const verifySubtitle =
    !verificationLevelRaw || verificationLevelRaw === "No verification"
      ? "Verify your identity"
      : verificationLevelRaw === "Photos"
        ? "Bronze · upgrade to Silver"
        : verificationLevelRaw === "Photos + ID"
          ? "Gold · highest trust"
          : String(verificationLevelRaw);
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

  return (
    <PageShell bottomPad="nav">
      {/* Soft-delete grace banner — only when deletion_requested_at
          is set. Sits ABOVE the hero so it's the first thing the
          user sees on returning to /profile during their 7-day
          cancel window. */}
      {deletionRequestedAt ? (
        <div className="px-5 pt-4">
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-pink/40 bg-pink/10 p-4 text-body text-white"
          >
            <div className="flex items-start gap-3">
              <TriangleAlert
                aria-hidden
                className="size-5 shrink-0 text-pink"
              />
              <div className="flex-1 min-w-0">
                <p className="text-meta font-medium leading-tight">
                  Your account is scheduled for deletion
                </p>
                <p className="text-caption leading-tight text-text-secondary">
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
        </div>
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
                {/* Hero — real firstName + age from useProfile (no more
                    hardcoded 'Ehud, 30'). Pill only renders when the
                    user actually has a verification level past 'None'. */}
                <h1 className="text-h1 leading-tight text-white">
                  {heroName || "Your profile"}
                  {age ? `, ${age}` : ""}
                </h1>
                {displayName &&
                displayName.toLowerCase() !== firstName.toLowerCase() &&
                firstName ? (
                  <p className="text-caption leading-tight text-text-secondary">
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
          {/* Hero CTA hides entirely for paid users — the row below
              already gives them a Subscription entry to manage. Keeping
              the Upgrade banner up after they've already paid is the
              dating-app equivalent of nagging a paying customer. */}
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
        transition={{ duration: 0.3, delay: 0.08 }}
        className="px-3 pt-8"
      >
        <ItemGroup className="gap-1">
          {PROFILE_LINKS.map((item) => (
            <Item
              key={item.title}
              variant="muted"
              render={
                <Link
                  href={item.href}
                  prefetch={false}
                  className="rounded-2xl"
                />
              }
            >
              <ItemMedia>
                <IconBadge tone={item.tone}>
                  <item.Icon />
                </IconBadge>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-meta text-white">
                  {item.title}
                </ItemTitle>
                {item.subtitle ? (
                  <ItemDescription className="text-caption text-text-muted">
                    {item.subtitle}
                  </ItemDescription>
                ) : null}
              </ItemContent>
              <ItemActions>
                <ChevronRight className="size-4 text-text-muted" />
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
        <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
          <DialogTrigger
            render={
              <Button
                variant="outlineSubtle"
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
                render={<Button variant="outlineSubtle" size="lg">Cancel</Button>}
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
      </motion.div>

      <BottomNav />
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
