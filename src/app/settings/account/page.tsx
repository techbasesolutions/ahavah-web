"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  AtSign,
  ChevronRight,
  KeyRound,
  Languages,
  Loader2,
  LogOut,
  Phone,
  Trash2,
} from "lucide-react";

import { useProfile } from "@/lib/use-profile";

import { Button } from "@/components/ui/button";
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

const ACCOUNT_FIELDS: ReadonlyArray<{
  Icon: typeof AtSign;
  title: string;
  value: string;
}> = [
  { Icon: AtSign,    title: "Email",            value: "ehud@example.com" },
  { Icon: Phone,     title: "Phone number",     value: "+1 (246) 555-0118" },
  { Icon: KeyRound,  title: "Password",         value: "Last changed 3 months ago" },
  { Icon: Languages, title: "Preferred language", value: "English (US)" },
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const { signOut } = useProfile();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    router.push("/");
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
        <PageHeaderTitle>Account</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Sign-in</h2>
          <ItemGroup className="gap-1">
            {ACCOUNT_FIELDS.map((field) => (
              <Item key={field.title} variant="muted">
                <ItemMedia>
                  <IconBadge tone="brand">
                    <field.Icon />
                  </IconBadge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta text-white">
                    {field.title}
                  </ItemTitle>
                  <ItemDescription className="text-caption text-text-muted">
                    {field.value}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4 text-text-muted" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </motion.section>

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.13 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Account actions</h2>
          <ItemGroup className="gap-1">
            <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
              <DialogTrigger
                nativeButton={false}
                render={
                  <Item
                    variant="muted"
                    className="cursor-pointer text-left"
                  >
                    <ItemMedia>
                      <IconBadge tone="brand">
                        <LogOut />
                      </IconBadge>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="text-meta text-white">
                        Log out
                      </ItemTitle>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight className="size-4 text-text-muted" />
                    </ItemActions>
                  </Item>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log out of Ahavah?</DialogTitle>
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
                      "Log out"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger
                nativeButton={false}
                render={
                  <Item
                    variant="muted"
                    className="cursor-pointer text-left"
                  >
                    <ItemMedia>
                      <IconBadge tone="destructive">
                        <Trash2 />
                      </IconBadge>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="text-meta text-pink">
                        Delete account
                      </ItemTitle>
                      <ItemDescription className="text-caption text-text-muted">
                        Permanently remove your data
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight className="size-4 text-text-muted" />
                    </ItemActions>
                  </Item>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete your account?</DialogTitle>
                  <DialogDescription>
                    This will permanently erase your profile, photos, matches, and messages.
                    This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outlineSubtle" size="lg">Cancel</Button>}
                  />
                  <DialogClose
                    render={
                      <Button size="lg" variant="destructive">
                        Delete forever
                      </Button>
                    }
                  />
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </ItemGroup>
        </motion.section>
      </div>

      <BottomNav />
    </PageShell>
  );
}
