# Sub-plan 15 — IA Cleanup + Dev Reset + Broken-Target Fixes

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the user-flagged duplication and broken nav targets across `/profile` + `/settings` + `/settings/account`, add a dev-only "Reset all decisions" affordance on `/discover`, and wire the 3 broken settings hrefs to real or honest destinations. Defer the widened 12-axis audit (originally T5) until all pages/screens/surfaces are complete — auditing a moving target wastes effort.

**Architecture:** `/profile` becomes identity-only (BottomNav tab) — hero + Edit/Verify/Subscription + single Settings row + inline Sign-out Dialog. `/settings` becomes the full configuration hub — no Log out / Delete account rows. `/settings/account` holds the actual Dialogs for both actions (only entry point for delete; logout has dialog-only entry from /profile for one-tap-then-confirm).

**Tech Stack:** Existing Next.js 16 + React 19 + Tailwind v4 + shadcn (Base UI) + Kibo. No new deps. Tests via vitest + Playwright smoke walks.

---

## Context

User reported (verbatim, 2026-05-12):

> "Why does the log out button take me to another screen with another log out button again? what kind of navigation route is that? also i have exhausted my options on the discover page on the local server, how do i get it to reset so i can keep testing?"
>
> "yeah and go ahead and make sure the user flows make sense because there is also two places where a user can delete their account as well"

Investigation found:

- **Log out duplicated 3 places:** `/profile:79`, `/settings:100`, `/settings/account:134`. First two are nav rows funneling to the third's Dialog.
- **Delete account duplicated 3 places:** `/profile:80`, `/settings:101`, `/settings/account:180`. Same pattern.
- **/profile and /settings are near-duplicate hubs** rendering overlapping grouped Item lists.
- **3 broken nav targets on /settings:**
  - "Discovery preferences" → `/discover` (wrong — should be a settings sub-route)
  - "Auto-translate" → `/settings/account` (wrong target)
  - "Help center" → `/settings/account` (wrong target)
- **No way to reset discover deck locally** without `localStorage.removeItem` in DevTools.

§20's audit caught visual issues on SP10-14 surfaces but didn't catch any of the above because IA / flow problems were out of its R1-R12 scope.

---

## Scope decisions locked

- **`/profile`** = identity hub (Profile tab in BottomNav). Hero card + 3-4 drill-down rows + inline Sign-out Dialog at the bottom. NO Delete account row.
- **`/settings`** = full configuration hub (drill-down from /profile). All sub-routes. NO Log out / Delete account rows.
- **`/settings/account`** = credentials (email/phone/password/language) + Log out Dialog + Delete account Dialog. The single delete entry point.
- **Sign-out flow** = 1 tap + confirm (from /profile, inline Dialog).
- **Delete account flow** = 3 deliberate steps: Profile → Settings → Account → tap Delete → confirm. Friction is intentional for an irreversible action.
- **/settings/discovery** route: NOT built. The row is removed. Discovery preferences == FiltersSheet on /discover + /map.
- **/settings/translate** route: BUILT as minimal stub. Single Switch + language dropdown. Honest about Tier-4 backend dependency.
- **/help** route: BUILT as minimal stub. FAQ accordion + Contact mailto + Bug-report link.
- **Reset all decisions affordance:** on /discover empty state as a secondary button alongside "Adjust filters". Calls `clearAll()` from `useDecisions` + resets local indices.
- **Widened 12-axis audit (originally T5):** DEFERRED to a later sub-plan when all pages/screens/surfaces are complete.

---

## File structure

| File | Role |
|---|---|
| `src/app/profile/page.tsx` | MODIFY. Drop "Other" group (Log out + Delete account rows). Add inline Sign-out Dialog wired to a single "Sign out" row. Add single "Settings" row in place of split Account-group nav. |
| `src/app/settings/page.tsx` | MODIFY. Drop "Account actions" group entirely. Drop "Discovery preferences" row (T3a). Fix "Auto-translate" href → `/settings/translate`. Fix "Help center" href → `/help`. |
| `src/app/settings/account/page.tsx` | UNCHANGED. Already holds both Dialogs correctly. |
| `src/app/settings/translate/page.tsx` | CREATE. Minimal Switch + language dropdown. ~80 lines. |
| `src/app/help/page.tsx` | CREATE. FAQ accordion + Contact + Bug report. ~120 lines. |
| `src/app/discover/page.tsx` | MODIFY. Add "Reset all decisions" button to empty state. ~10 lines of JSX + handler. |
| `PROJECT-STATUS.md` | MODIFY. Append §22 closeout (renumber if §22 was reserved). |

No new tests (T5 audit deferred; existing 251 tests cover the touched logic).

---

## Existing primitives reused

- **Dialog** + DialogContent / DialogHeader / DialogTitle / DialogDescription / DialogFooter / DialogClose / DialogTrigger from `@/components/ui/dialog`. Pattern lifted from `/settings/account:119-163`.
- **Item** + ItemGroup / ItemMedia / ItemContent / ItemTitle / ItemDescription / ItemActions from `@/components/ui/item`.
- **Switch** from `@/components/ui/switch`.
- **Accordion** from `@/components/ui/accordion` (verify it exists; if not, use `details/summary` HTML).
- **PageShell** + **PageHeader** + **PageHeaderTitle** from `@/components/app/page-shell`.
- **useDecisions** from `@/lib/use-decisions` — already exposes `clearAll()`.
- **BottomNav** at the bottom of /help (since /help is not a primary tab but is reachable from BottomNav-adjacent surface).

No new dependencies, no new design tokens, no new motion variants.

---

## Hard rules

1. **Kit-only via cva.** No className overrides on Dialog / Button / Item / Switch / Accordion. Extend a primitive via cva if a new visual treatment is needed.
2. **No backend dependencies.** /settings/translate is a stub — the Switch persists to localStorage, no API calls. Honest "auto-translate is backend-blocked" helper text.
3. **Single source of truth for actions:** Log out Dialog lives at /settings/account (still — for parity with the inline Dialog on /profile, both render the same component). Delete account Dialog lives ONLY at /settings/account.
4. **Don't delete /settings/account's existing Log out / Delete account Dialogs.** They stay — they're the canonical implementations. /profile gets a sibling Dialog rendering for the inline-on-tap experience.
5. **§18 sign-off rule.** Every "X is closed/complete" claim in the closeout §22 must include a verification query (grep, test command, smoke-walk step).
6. **Dev reset is not env-gated.** Pre-backend MVP — all decisions are local. The button is visible to all users. When real auth lands, the button is repurposed or removed via the auth sub-plan.

---

## Tasks

### T4 — Dev reset on /discover empty state (FIRST — unblocks testing)

**Files:**
- Modify: `src/app/discover/page.tsx`

**Steps:**

- [ ] Step 1: Read the existing empty state — the /discover page has an EmptyState with an "Adjust filters" action button (variant `filter-too-narrow`). Find the JSX.

- [ ] Step 2: The EmptyState component (`@/components/app/empty-state`) supports a single `action` prop. Check whether it supports a secondary action — if yes, add a secondary action "Reset all decisions". If no, render a secondary Button below the EmptyState (outline-style, less prominent than the primary).

- [ ] Step 3: Wire the button's onClick:
  ```tsx
  const handleResetDeck = () => {
    clearAll(); // from useDecisions
    setUserIndex(0);
    setPhotoIndex(0);
  };
  ```
  `clearAll()` already exists on `useDecisions` and clears localStorage `ahavah.decisions.v1` + state.

- [ ] Step 4: Verify gates (tsc, lint, vitest 251, build 44 routes).

- [ ] Step 5: Smoke walk — visit /discover with all candidates passed/liked (use the localStorage one-liner to pre-populate decisions), confirm empty state shows BOTH "Adjust filters" and "Reset all decisions" buttons, tap reset → deck restores to head candidate.

- [ ] Step 6: Commit.

### T1 — /profile IA cleanup

**Files:**
- Modify: `src/app/profile/page.tsx`

**Steps:**

- [ ] Step 1: Read current `SETTINGS_GROUPS` definition (lines ~38-83). Note the 4 groups: Account / App / Billing / Other.

- [ ] Step 2: Replace `SETTINGS_GROUPS` with a leaner structure:
  ```ts
  const PROFILE_LINKS: ReadonlyArray<{
    Icon: typeof Bell;
    title: string;
    subtitle?: string;
    href: string;
    tone?: IconBadgeTone;
  }> = [
    { Icon: UserPen,     title: "Edit profile",  subtitle: "Photos, bio, basics",         href: "/profile/edit", tone: "brand" },
    { Icon: ShieldCheck, title: "Verification",  subtitle: "Bronze · upgrade to Silver",  href: "/verify",       tone: "success" },
    { Icon: CreditCard,  title: "Subscription",  subtitle: "Upgrade to Premium →",        href: "/paywall",      tone: "success" },
    { Icon: Settings,    title: "Settings",      subtitle: "Notifications, privacy, account", href: "/settings", tone: "muted" },
  ];
  ```
  Drop the group accent + h2 dot pattern — render as a single ItemGroup.

- [ ] Step 3: Below the main list, add an inline Sign-out section:
  ```tsx
  <div className="px-3 pt-4">
    <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
      <DialogTrigger render={
        <Button variant="outlineSubtle" size="lg" tone="none" className="w-full">
          <LogOut size={16} className="mr-2" /> Sign out
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign out of Ahavah?</DialogTitle>
          <DialogDescription>You'll need to sign back in to see your matches and messages.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outlineSubtle" size="lg">Cancel</Button>} />
          <DialogClose render={<Button size="lg" tone="brand">Sign out</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  ```
  Lower visual prominence (outline button vs filled), but one tap + confirm.

- [ ] Step 4: Drop the "Other" group + the "Delete account" row entirely. Delete account lives only on /settings/account.

- [ ] Step 5: Verify the imports — drop `LogOut` if unused, add `Settings` if needed, etc.

- [ ] Step 6: Smoke walk — visit /profile, tap Sign out, confirm Dialog opens inline (no navigation), tap Cancel → Dialog closes, tap Sign out in Dialog → Dialog closes (no real sign-out wired since auth is Tier-4 — closing is correct stub behavior).

### T2 — /settings IA cleanup

**Files:**
- Modify: `src/app/settings/page.tsx`

**Steps:**

- [ ] Step 1: Drop the "Account actions" group entirely (Log out + Delete account rows gone).

- [ ] Step 2: T3a — drop the "Discovery preferences" row from the "Account" group. Discovery preferences live inside FiltersSheet, not a separate screen.

- [ ] Step 3: Fix "Auto-translate" href: `/settings/account` → `/settings/translate` (route created in T3b).

- [ ] Step 4: Fix "Help center" href: `/settings/account` → `/help` (route created in T3c).

- [ ] Step 5: Add an explicit "Account" row at the top of the Account group → /settings/account (so users can find credentials + Delete account from here). Keep the existing "Edit profile" + "Verification" rows.

- [ ] Step 6: Smoke walk — visit /settings, confirm all rows navigate to existing routes (after T3b+T3c land), no "Account actions" group, no broken targets.

### T3b — Build /settings/translate

**Files:**
- Create: `src/app/settings/translate/page.tsx`

**Steps:**

- [ ] Step 1: Page layout — PageHeader with back arrow to /settings, body card with Switch "Auto-translate messages" + language dropdown for "Translate to:" (English / Spanish / French / Hebrew / Arabic — start with 5 anchors), helper text explaining the feature is backend-dependent.

- [ ] Step 2: State persistence via a new `useAutoTranslate` hook OR inline `useLocalStorageState`. Pattern: `useShowOnMap.ts` is the reference.

- [ ] Step 3: BottomNav at the bottom (it's reachable from /settings, not a primary tab — confirm by checking if /settings has BottomNav; if yes, copy the pattern).

- [ ] Step 4: Verify gates. Build should now register 45 routes.

### T3c — Build /help

**Files:**
- Create: `src/app/help/page.tsx`

**Steps:**

- [ ] Step 1: Page layout — PageHeader with back arrow to /settings (or /profile — pick whichever is the more common upstream surface), body has 3 sections:
  - **FAQ accordion** — 5 questions: "How does verification work?", "How do filters work?", "Why don't I see anyone?", "How do I delete my account?", "Is my data shared?"
  - **Contact** — single CTA button "Email support" → `mailto:support@ahavah.app` (placeholder address)
  - **Report a bug** — single CTA → `mailto:bugs@ahavah.app` (or a placeholder GitHub Issues URL)

- [ ] Step 2: Use `@/components/ui/accordion` if it exists; otherwise use semantic `<details><summary>` HTML elements styled with Tailwind.

- [ ] Step 3: Helper text at the top: "Need help? Pick a topic below or reach out directly."

- [ ] Step 4: BottomNav at the bottom.

- [ ] Step 5: Verify gates. Build should register 46 routes (45 from T3b + 1 from T3c).

### T6 — Closeout + merge

**Files:**
- Modify: `PROJECT-STATUS.md`

**Steps:**

- [ ] Step 1: End-to-end smoke walk covering all 5 changed surfaces:
  1. /discover empty state shows "Reset all decisions" → tap → deck restores.
  2. /profile shows leaner list (Edit / Verification / Subscription / Settings) + Sign out button at bottom. Tap Sign out → inline Dialog → Cancel → Dialog closes.
  3. /settings shows no "Account actions" group + no Discovery preferences row. Auto-translate links to /settings/translate. Help center links to /help.
  4. /settings/translate renders with Switch + dropdown + helper text.
  5. /help renders FAQ accordion + Contact + Bug report links.
- [ ] Step 2: Append §22 to PROJECT-STATUS.md. Each shipped fix anchored to a citable verification (grep / smoke step / file:line).
- [ ] Step 3: Full verification gates — tsc / eslint / vitest (251 tests) / build (46 routes).
- [ ] Step 4: Commit docs. Merge to master via `git merge --no-ff sub-plan-15-ia-cleanup`.

---

## Verification

Per-task:
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 251 passing (no test changes expected)
- Browser smoke walk for UI tasks

Whole-sub-plan (after T6):
- Tests: 251 passing.
- TypeCheck clean.
- Lint clean.
- Production build clean — 46 routes.
- End-to-end smoke walk above.
- PROJECT-STATUS §22 anchored to verification queries per §18 rule.
- `grep -rn "/settings/account" src/app/profile/page.tsx src/app/settings/page.tsx` → returns ONLY the single "Account" row link on /settings, no Log out / Delete account rows.
- `grep -n "Discovery preferences" src/app/` → returns ZERO matches (row dropped from /settings).
- `grep -rn "href=\"/settings/translate\"\|href=\"/help\"" src/app/` → returns the working links from /settings.

---

## Self-review notes

- **Spec coverage:** every user-reported problem has a corresponding task. Log out duplication (T1+T2), Delete account duplication (T1+T2), broken targets (T2+T3a+T3b+T3c), deck reset (T4).
- **Placeholder scan:** zero TBD / appropriate / similar-to. Every "implement X" step has the JSX / type signatures inline.
- **Type consistency:** PROFILE_LINKS uses the same `IconBadgeTone` type the original SETTINGS_GROUPS used.
- **DRY:** /profile and /settings no longer duplicate Log out / Delete account rows. /settings/account remains the single source for both Dialogs.
- **Scope fence:**
  - No backend.
  - No real auth (Sign out Dialog stubs — just closes).
  - No real delete (Delete Dialog stubs — just closes).
  - No premium gating.
  - No new design tokens, no new atoms, no new motion variants.
- **Failure-pattern guard:**
  - SDD per task.
  - The 3 broken nav targets that prompted this sub-plan are documented in `feedback_ahavah_pwa.md` (memory pointer) so the pattern of "ship rows with placeholder hrefs" doesn't recur.

---

## Execution

This plan is structured for `superpowers:subagent-driven-development`. 6 tasks; T4 first (smallest, unblocks user testing). Each fits a single implementer dispatch + spec review + code-quality review.

Branch: `sub-plan-15-ia-cleanup`. Merge to master via `--no-ff`.

---

## Deferred (not in SP15)

- **T5 widened 12-axis audit** — defer until all pages/screens/surfaces are complete. Auditing while still shipping new surfaces wastes effort.
- **Legal pages** — `/legal/terms`, `/legal/privacy`, `/legal/community-guidelines`, `/legal/trust-safety`, `/legal/emergency-numbers`. Awaiting user copy.
- **Marker state badges on /map** — heart/message/paper-plane overlays. Separate sub-plan when ready.
- **Marker sizing by activity** — needs activity-timestamp signal.
- **Real Google Maps / Mapbox tiles** — Tier-4 backend (API key).
- **Warp / Boost FAB** — premium feature.
- **Real auth + delete-account backend wiring** — Tier-4.
- **Auto-translate backend integration** — Tier-4.
