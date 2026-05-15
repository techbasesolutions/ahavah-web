"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  AtSign,
  ChevronRight,
  Loader2,
  LogOut,
  Trash2,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
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
import { Input } from "@/components/ui/input";
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

export default function AccountSettingsPage() {
  const router = useRouter();
  const { profile, update, signOut } = useProfile();
  // /me adds `email` to the profile cache; not on the Profile type yet
  // so cast at this consumer.
  const accountFields = profile as Partial<Record<string, unknown>>;
  const email = typeof accountFields.email === "string" ? accountFields.email : "";

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  // Two-step email change: collect new address → POST request → show OTP
  // input → POST verify → swap. State machine inside the modal.
  const [emailStep, setEmailStep] = useState<"input" | "otp" | "done">("input");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const resetEmailFlow = () => {
    setEmailStep("input");
    setNewEmail("");
    setEmailOtp("");
    setEmailError(null);
    setEmailBusy(false);
  };

  const handleEmailRequest = async () => {
    if (emailBusy) return;
    setEmailBusy(true);
    setEmailError(null);
    try {
      await apiClient.post("/account/change-email-request", { new_email: newEmail.trim() });
      setEmailStep("otp");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Couldn't send the code.");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleEmailVerify = async () => {
    if (emailBusy) return;
    setEmailBusy(true);
    setEmailError(null);
    try {
      await apiClient.post<{ email: string }>("/account/change-email-verify", {
        otp: emailOtp.trim().toUpperCase(),
      });
      setEmailStep("done");
      // Refresh /me so the row reflects the new email immediately.
      await update({} as never);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Couldn't verify the code.");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    router.push("/");
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete("/account");
      // Backend SOFT-deletes (mig 0008): activated=false +
      // deletion_requested_at=NOW(), purge after 7 days. Bounce to
      // /profile so the grace banner + Cancel deletion CTA are visible
      // (those only render on /profile gated by deletionRequestedAt).
      // Don't signOut — the user's session needs to stay live for them
      // to see + use the "Cancel deletion" CTA during the grace window.
      router.push("/profile");
    } catch {
      setDeleteError("Couldn't delete your account. Try again or contact admin@ahavah.app.");
      setDeleting(false);
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
        <PageHeaderTitle>Account</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        {/* Sign-in details — email + preferred language. Phone + password
            rows deliberately removed: app uses OTP-only auth (no
            password), and phone-number swapping requires backend
            endpoints that don't exist yet. */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Sign-in</h2>
          <ItemGroup className="gap-1">
            {/* Email row — opens a modal explaining how to change it.
                Real change-email flow needs a backend endpoint that
                doesn't exist yet; for now we surface the value and a
                clear path (contact admin) instead of a fake button. */}
            <Dialog
              open={emailChangeOpen}
              onOpenChange={(open) => {
                setEmailChangeOpen(open);
                if (!open) resetEmailFlow();
              }}
            >
              <DialogTrigger
                nativeButton={false}
                render={
                  <Item variant="muted" className="cursor-pointer text-left">
                    <ItemMedia>
                      <IconBadge tone="brand">
                        <AtSign />
                      </IconBadge>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="text-meta text-white">Email</ItemTitle>
                      <ItemDescription className="text-caption text-text-muted">
                        {email || "Loading…"}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight className="size-4 text-text-muted" />
                    </ItemActions>
                  </Item>
                }
              />
              <DialogContent>
                {emailStep === "input" && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Change your email</DialogTitle>
                      <DialogDescription>
                        We&apos;ll send a 6-character code to your new email to
                        confirm. Your current email stays active until you enter
                        the code.
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="new@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      aria-label="New email address"
                      size="lg"
                      tone="elevated"
                    />
                    {emailError && (
                      <p
                        role="alert"
                        aria-live="polite"
                        className="text-caption font-semibold text-pink"
                      >
                        {emailError}
                      </p>
                    )}
                    <DialogFooter>
                      <DialogClose
                        render={<Button variant="outlineSubtle" size="lg">Cancel</Button>}
                      />
                      <Button
                        size="lg"
                        tone="brand"
                        onClick={handleEmailRequest}
                        disabled={emailBusy || !newEmail.includes("@")}
                      >
                        {emailBusy ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Sending code...
                          </>
                        ) : (
                          "Send code"
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                )}

                {emailStep === "otp" && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Enter the code</DialogTitle>
                      <DialogDescription>
                        We sent a 6-character code to{" "}
                        <span className="text-white">{newEmail}</span>. Enter it
                        below to swap your email. The code expires in 15 minutes.
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      placeholder="A1B2C3"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.toUpperCase())}
                      aria-label="6-character code"
                      size="lg"
                      tone="elevated"
                      maxLength={6}
                      className="text-center font-mono uppercase tracking-widest"
                    />
                    {emailError && (
                      <p
                        role="alert"
                        aria-live="polite"
                        className="text-caption font-semibold text-pink"
                      >
                        {emailError}
                      </p>
                    )}
                    <DialogFooter>
                      <Button
                        variant="outlineSubtle"
                        size="lg"
                        onClick={() => setEmailStep("input")}
                        disabled={emailBusy}
                      >
                        Back
                      </Button>
                      <Button
                        size="lg"
                        tone="brand"
                        onClick={handleEmailVerify}
                        disabled={emailBusy || emailOtp.trim().length !== 6}
                      >
                        {emailBusy ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          "Verify and swap"
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                )}

                {emailStep === "done" && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Email updated</DialogTitle>
                      <DialogDescription>
                        Your sign-in email is now{" "}
                        <span className="text-white">{newEmail}</span>. Use it the
                        next time you log in.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose
                        render={<Button size="lg" tone="brand">Done</Button>}
                      />
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>

            {/* Preferred-language picker hidden until DeepL translations
                ship (Phase W §9 deliberately defers i18n/translation).
                The person.primary_language column is real and the picker
                works, but exposing it now creates the 'looks done but
                does nothing' pattern the user has flagged. Restore when
                /chat actually translates incoming messages. */}
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
                  <Item variant="muted" className="cursor-pointer text-left">
                    <ItemMedia>
                      <IconBadge tone="brand">
                        <LogOut />
                      </IconBadge>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="text-meta text-white">Log out</ItemTitle>
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
                  <Item variant="muted" className="cursor-pointer text-left">
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
                    Your profile will go invisible immediately and be
                    permanently deleted in 7 days. You&apos;ll see a
                    &ldquo;Cancel deletion&rdquo; banner on your{" "}
                    <span className="text-white">Profile</span> page
                    during the 7-day window — tap it any time to undo.
                    After 7 days deletion is irreversible.
                  </DialogDescription>
                </DialogHeader>
                {deleteError ? (
                  <p
                    role="alert"
                    aria-live="polite"
                    className="text-caption font-semibold text-pink"
                  >
                    {deleteError}
                  </p>
                ) : null}
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outlineSubtle" size="lg">Cancel</Button>}
                  />
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete forever"
                    )}
                  </Button>
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
