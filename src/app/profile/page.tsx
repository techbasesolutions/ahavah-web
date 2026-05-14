"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ChevronRight, CreditCard, Loader2, LogOut, Settings,
  ShieldCheck, Sparkles, UserPen,
} from "lucide-react";

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
  const { profile, signOut } = useProfile();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Real values from useProfile (cache + /me + /profile-info). The hero
  // card previously hardcoded 'Ehud, 30' and 'Bronze verified' — those
  // never updated. Defaults below cover the brief mount-before-fetch
  // window without showing someone else's name.
  const firstName = profile.firstName ?? "";
  const age = typeof profile.age === "number" && profile.age > 0 ? profile.age : null;
  const initial = firstName ? firstName[0].toUpperCase() : "•";
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
  const hasGold = (profile as Record<string, unknown>).has_gold === true;
  const subscriptionSubtitle = hasGold
    ? "Premium · manage subscription"
    : "Upgrade to Premium →";
  const PROFILE_LINKS: ReadonlyArray<ProfileLink> = [
    { Icon: UserPen,     title: "Edit profile", subtitle: "Photos, bio, basics",             href: "/profile/edit", tone: "brand" },
    { Icon: ShieldCheck, title: "Verification", subtitle: verifySubtitle,                    href: "/verify",       tone: "success" },
    { Icon: CreditCard,  title: "Subscription", subtitle: subscriptionSubtitle,              href: "/paywall",      tone: "success" },
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

  return (
    <PageShell bottomPad="nav">
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
                  {firstName || "Your profile"}
                  {age ? `, ${age}` : ""}
                </h1>
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
          {!hasGold && (
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
