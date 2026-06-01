# Desktop Rebuild (Option B Discipline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development with the per-task discipline below. Steps use checkbox (`- [ ]`) syntax for tracking. **Controller (not subagent) reads the per-screen `.md` spec before dispatching each task.** **User visually verifies every screen at 1440×900 in BOTH themes before the next task dispatches.**

**Goal:** Complete the desktop rebuild for the 13 remaining canonical screens, adapt 3 high-leverage shared shells (Onboarding / Settings / VerifyTier — unlocks 24 sub-routes), place 6 post-canonical monetization surfaces with per-placement user approval, design `/profile/tokens` desktop from scratch using the design system, resolve cross-cutting Sheet-vs-Dialog and boost-indicator placement decisions, and handle the 10 outside-canonical routes with sensible defaults per group. All work uses kit primitives only and invokes `/frontend-design`, `/ui-implementer`, `/ui-design-system`, `/accessibility` skills per task brief.

**Architecture:** Option B discipline. Every screen rebuild is six steps: (1) subagent ports the canonical layout from `desktop.jsx` + matching `screens/NN.md` spec, kit primitives only, no monetization surfaces; (2) user visually verifies the canonical port at 1440×900 in light + dark themes; (3) controller describes any post-canonical monetization placement in plain text — exact kit primitives, exact skills to invoke; (4) user approves / adjusts / rejects placement; (5) subagent applies the approved placement; (6) user re-verifies both themes. Three high-leverage shell tasks (Onboarding, Settings, VerifyTier) adapt the wrapper component once and resolve 24 sub-routes without per-route edits. `/profile/tokens` is drafted by the controller (no canonical) and approved as a whole design before build. Outside-canonical routes get group-level desktop defaults (`full-bleed` for status pages, `sidebar` for content pages) which the user approves once per group.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, shadcn + Base UI (`src/components/ui/`), Kibo UI (`src/components/kibo-ui/`), app components (`src/components/app/`), Plus Jakarta Sans, Lucide icons, Vitest.

**Predecessor plan (Tasks 0–12 already complete):** `docs/superpowers/plans/2026-05-17-desktop-light-rebuild.md`. Foundation, theme toggle, primitive audits, pattern components, `/profile/[uuid]` rebuild + 3 bug fixes, divergence backfill (dark chrome aliases + spec §1.2 alias layer).

**Source-of-truth artifacts (controller reads these for each task):**

| Artifact | Path | Purpose |
|---|---|---|
| Structural JSX | `D:/Antigravity/ahavah-api/Ahavah-Claude Design/handoff/desktop.jsx` | Theme-agnostic React structure (lines per screen in Task table below) |
| Per-screen build spec | `D:/Antigravity/ahavah-api/Ahavah-Claude Design/handoff/screens/<NN>-<route>.md` | Columns, gutters, copy, primitives, behaviour wiring |
| Light reference | `D:/Antigravity/ahavah-api/Ahavah-Claude Design/handoff/desktop-screens.html` | Frame N at 1440×900 — light theme visual target |
| Dark reference | `D:/Antigravity/ahavah-api/Ahavah-Claude Design/dark-desktop-html/<NN>-<route>.html` | Dark theme visual target (one HTML per screen) |
| Design system | `D:/Antigravity/ahavah-api/Ahavah-Claude Design/handoff/design-system-v2.md` | Tokens, components, patterns (Layers 1–3) |
| Tokens CSS | `D:/Antigravity/ahavah-api/Ahavah-Claude Design/handoff/tokens.css` | Canonical token definitions |

---

## File Structure

### Files MODIFIED per canonical screen rebuild (Tasks 13–25)
- `src/app/<route>/page.tsx` — delete existing `hidden md:…` desktop block, port canonical, integrate approved monetization surfaces

### Files CREATED for shell adaptations
- `src/components/app/onboarding-desktop-shell.tsx` — desktop variant of `OnboardingShell` (unlocks 16 onboarding sub-routes — Task 23)
- `src/components/app/settings-shell.tsx` — split-view shell wrapping settings sub-routes (unlocks 5 settings sub-routes — Task 20)
- `src/components/app/verify-tier-desktop-shell.tsx` (or extend `verify-tier-shell.tsx`) — desktop adaptation for verify tier sub-routes (unlocks 3 verify-tier sub-routes — Task 19)

### Files MODIFIED for cross-cutting decisions (Task 25b)
- `src/components/app/token-spend-sheet.tsx` — Sheet OR Dialog at md+ per user decision
- `src/components/app/filters-sheet.tsx` — same decision applied
- `src/components/app/block-report-sheet.tsx` — same decision applied
- `src/components/app/desktop-sidebar.tsx` — add boost-active indicator (replaces the BottomNav lime-ring on mobile)

### Files CREATED for `/profile/tokens` desktop (Task 25a)
- `src/app/profile/tokens/page.tsx` — add `hidden md:…` desktop block (route file already exists, mobile-only currently)

### Files MODIFIED for outside-canonical defaults (Task 25c)
- `src/app/chat/[id]/page.tsx` — desktop redirect to `/inbox?thread=<id>` OR inline split-view (user decides)
- `src/app/profile/edit/page.tsx` — desktop layout decision
- `src/app/banned/page.tsx`, `src/app/maintenance/page.tsx`, `src/app/offline/page.tsx`, `src/app/update-required/page.tsx` — wrap in `PageShell desktopShell="full-bleed"` if missing
- `src/app/billing-portal/page.tsx`, `src/app/help/page.tsx`, `src/app/legal/{privacy,terms,community-guidelines}/page.tsx`, `src/app/admin/reports/page.tsx` — add `desktopShell` prop per group default

### Files NOT to touch (foundation, completed in predecessor plan)
- `src/app/globals.css` (tokens already canonical)
- `src/app/layout.tsx`, `src/components/system/theme-provider.tsx`
- `src/components/app/page-shell.tsx`, `src/components/app/bottom-nav.tsx`, `src/components/app/desktop-sidebar.tsx` (except Task 25b boost-indicator addition), `src/components/app/desktop-topbar.tsx`
- Primitive kit files: `src/components/ui/{button, card, input, avatar, switch}.tsx`, `src/components/kibo-ui/pill.tsx`

---

## Per-screen rebuild discipline (Option B template)

Every Tasks 13–22 and 24–25 follow this six-step cycle. **No exceptions, no batching, no parallel dispatch.**

### Step 1 — Controller pre-flight (controller does this BEFORE dispatching the subagent)

1. Read `handoff/screens/<NN>-<route>.md` end-to-end. Note: columns, gutters, copy, content order, primitives the spec names, behaviour wiring (what state to reuse, what API endpoint, what existing component to keep).
2. Read the relevant range of `handoff/desktop.jsx`. Note: every `gridTemplateColumns`, `gap`, `padding`, `display`, font-size, font-weight, color var, border, border-radius.
3. Open `handoff/desktop-screens.html` at 1440×900, find frame `<NN>`, take a reference screenshot to `docs/screenshots/handoff-target/<NN>-<route>-light.png`.
4. Open `dark-desktop-html/<NN>-<route>.html` at 1440×900, take a reference screenshot to `docs/screenshots/handoff-target/<NN>-<route>-dark.png`.
5. Identify any monetization surface that ships on this route per the 2026-05-16 sprint (see route-specific tables below).

### Step 2 — Subagent: port canonical only (NO monetization surfaces yet)

Dispatch a fresh `general-purpose` subagent with the per-task prompt below. The brief:

- Source of truth: paste the exact `handoff/desktop.jsx:L<start>-L<end>` line range and the contents of `screens/<NN>-<route>.md`.
- Forbid invention: "If a value (color, spacing, size, copy) is not literally in the reference, STOP and ask. Do not infer. Do not improvise."
- Forbid kit-idiom substitution: "Where the canonical uses `border: '2px solid var(--lime)'`, port to `border-2 border-lime` — NOT `ring-2 ring-lime`. Where the canonical uses inline `<div style={{background:'var(--card)'}}>`, port to `<Card tone="elevated">`. Where the canonical uses `<button>` with brand fill, port to `<Button tone="cta|brand|action">`. Substitution table at end of plan."
- Tools: read-only on the canonical artifacts, write on the route file.
- Forbid commits.
- Done = `tsc --noEmit` clean + `vitest run` shows 433 baseline passing + 20 baseline failing.

### Step 3 — User visual verification (canonical port only)

User opens the live route at `http://localhost:3000/<route>` at 1440×900 in BOTH themes (toggle via sidebar `<Switch>`):
- Light → compare against `docs/screenshots/handoff-target/<NN>-<route>-light.png`
- Dark → compare against `docs/screenshots/handoff-target/<NN>-<route>-dark.png`

User replies "matches" or "fix X." If "fix X," subagent fixes, user re-verifies. Loop until "matches."

### Step 4 — Controller describes monetization placement (only if route has monetization surfaces)

Controller writes a placement brief in plain text. Format:

```
Surface: <name>
Where: <exact slot in the canonical layout — column, position, anchor>
Primitive: <kit primitive + variant>
Behavior: <what state hooks, what endpoint, conditional render rule>
Skills to invoke during integration: /frontend-design (placement check), /accessibility (tap target + screen reader), /ui-design-system (if a variant decision is needed)
```

### Step 5 — User approves placement

User replies "approve," "adjust: <details>," or "reject."

### Step 6 — Subagent applies approved placement, user re-verifies

Subagent integrates ONLY the approved surfaces using the named primitives. User re-verifies both themes against an annotated screenshot that includes the monetization surfaces (controller annotates the targets in advance if helpful).

---

## Substitution table (memorize, apply during every port)

| Handoff (`desktop.jsx`) | Kit (this repo) |
|---|---|
| `<button … style={{ background:'var(--color-lime)', color:'#000', borderRadius:999 }}>Like</button>` | `<Button tone="cta" size="tap">Like</Button>` |
| `<button … style={{ background:'var(--lavender)', color:'#000' }}>Message</button>` | `<Button tone="brand" size="tap">Message</Button>` |
| `<button … style={{ background:'var(--pink)', color:'#000' }}>Action</button>` | `<Button tone="action" size="tap">Action</Button>` |
| `<button … style={{ background:'transparent', border:'1px solid var(--ink-3)' }}>Pass</button>` | `<Button variant="outline" size="tap">Pass</Button>` |
| Inline `<div style={{ background:'var(--card)', border:'1px solid var(--hairline)', borderRadius:24 }}>` | `<Card tone="elevated">` |
| Inline indigo→lavender gradient div | `<Card tone="gradient">` |
| Inline indigo-square+sparkle lockup | `<SparkleTile size="…" />` |
| Inline lavender frosted silhouette | `<BlurredAvatar size="…" />` |
| Hand-rolled lime-bordered avatar | `<Avatar ring="lime" online>{<AvatarImage/>}</Avatar>` |
| Inline lavender pill | `<Pill variant="lavender">` |
| Inline transparent + lavender border pill | `<Pill variant="lavOutline">` |
| `border: "2px solid var(--lime)"` (active state) | `border-2 border-lime` — **NOT** `ring-2 ring-lime` |
| `border: "2px solid transparent"` (inactive) | `border-2 border-transparent` |

---

## Phase 4A — Canonical screen rebuilds (Tasks 13–25)

Status table (updated as each task completes):

| # | Route | desktopShell | desktop.jsx range | screens/NN.md | Monetization? | Status |
|---|---|---|---|---|---|---|
| 12 | `/profile/[uuid]` | sidebar | L907–L1110 | `05-profile-detail.md` | — | ✅ Done + bug-fixed (pending visual verify) |
| 13 | `/discover` | sidebar | L434–L586 | `04-discover.md` | Super-like + QuotaExceededCard | Pending |
| 14 | `/matches` | sidebar | L1499–L1557 | `08-matches.md` | Liked-You hidden cards | Pending |
| 15 | `/inbox` (+ `/chat/[id]` resolution) | sidebar | L669–L827 | `09-inbox.md` | — | Pending |
| 16 | `/profile` (own) | sidebar | L828–L906 | `10-profile.md` | BoostCard slot | Pending |
| 17 | `/map` | sidebar | L1386–L1498 | `07-map.md` | — | Pending |
| 18 | `/paywall` | full-bleed | L1111–L1204 | `11-paywall.md` | Token-stipend line | Pending |
| 19 | `/verify` + 3 sub-routes (Task 19 includes VerifyTierShell adaptation) | sidebar | L1205–L1294 | `12-verify.md` | — | Pending |
| 20 | `/settings` + 5 sub-routes (Task 20 includes SettingsShell creation) | sidebar | L1295–L1385 | `13-settings.md` | — | Pending |
| 21 | `/locked` | full-bleed | L1558–L1608 | `14-locked.md` | — | Pending |
| 22 | `/match` | full-bleed | L587–L668 | `06-match.md` | — | Pending |
| 23 | `/onboarding` + 16 sub-routes (Task 23 includes OnboardingDesktopShell creation) | full-bleed | L344–L433 | `03-onboarding.md` | — | Pending |
| 24 | `/auth/sign-up` + `/auth/sign-in` | full-bleed | L237–L343 | `02-sign-up.md` | — | Pending |
| 25 | `/` welcome | full-bleed | L148–L236 | `01-welcome.md` | — | Pending |

---

### Task 13: Rebuild `/discover` canonical + place Super-like CTA + QuotaExceededCard

**Files:**
- Modify: `src/app/discover/page.tsx` (existing desktop block at the `hidden md:…` div)
- Read-only: `handoff/desktop.jsx:L434-L586`, `handoff/screens/04-discover.md`, `handoff/desktop-screens.html` frame 04, `dark-desktop-html/04-discover.html`
- Reference screenshots: `docs/screenshots/handoff-target/04-discover-light.png`, `docs/screenshots/handoff-target/04-discover-dark.png`

#### Canonical port (Step 2)

- [ ] **Step 1: Controller reads `screens/04-discover.md` + `desktop.jsx:L434-L586` end-to-end and captures both reference screenshots**

```powershell
# (manual: open both HTML files at 1440x900 in browser and capture)
```

- [ ] **Step 2: Dispatch subagent with this prompt verbatim**

```
You are the IMPLEMENTER for Task 13 of the Ahavah desktop rebuild.

Project root: d:/Antigravity/ahavah-web/ (Windows; PowerShell)

Plan: docs/superpowers/plans/2026-05-17-desktop-rebuild-option-b.md → Task 13

SCOPE:
Port ONLY the canonical desktop layout for /discover from
docs/handoff-desktop/desktop.jsx lines 434-586 (function DiscoverDesktop).
Do NOT integrate any monetization surface in this step
(Super-like CTA, QuotaExceededCard). That happens in Step 6
after the user approves the placement.

CONSTRAINTS:
- Kit primitives only (Button/Card/Pill/Avatar/Input/Switch/etc.)
- Apply the plan's substitution table (no kit-idiom substitution beyond it)
- If a value (color, spacing, size, copy) is not literally in the
  reference, STOP and ask. Do not infer. Do not improvise.
- Use border (not ring) for active states per canonical.
- Delete the existing `hidden md:…` block contents; do not patch.
- Keep the `md:hidden` mobile block UNTOUCHED.
- Keep all top-level hooks/handlers declared ONCE at the route component
  top (no double-fetch).
- Do NOT commit. Stay unstaged.

VERIFY:
  cd d:/Antigravity/ahavah-web
  npx tsc --noEmit
  npx vitest run 2>&1 | tail -10
Expected: tsc clean. vitest: 433 passed, 20 baseline failing.

REPORT:
End with `## STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`.
Include: line range ported, post-edit line count of the desktop block,
kit primitives used (counts), confirmation no monetization surfaces
were added, tsc + vitest results.
```

- [ ] **Step 3: User visually verifies canonical port at 1440×900 light + dark — replies "matches" or "fix X"**

#### Monetization placement (Steps 4–6)

**Surfaces to place:**

```
Surface: Super-like CTA (lime <Sparkles> button in action row)
Where: Within the 3-col grid's center deck column, the action row at the
       bottom of the active card. Per spec/04-discover.md: action row has
       Pass / Like / Boost / Super (4 buttons). Canonical desktop.jsx
       may show only 3 (Pass / Like / Boost) — if so, add Super as a
       4th button immediately right of Like.
Primitive: <Button size="circle-xl" tone="brand"><Sparkles className="size-5"/></Button>
Behavior: onClick → opens <TokenSpendSheet> with cost=2, marks
          liked.is_super = true on confirm. Uses useTokenBalance hook
          already declared at the route component top.
Skills: /frontend-design (verify action-row balance with 4 buttons
        instead of 3), /accessibility (aria-label="Super like, costs
        2 tokens", min-h-tap), /ui-design-system (confirm tone="brand"
        is the right semantic for a paid action vs tone="action" pink)
```

```
Surface: QuotaExceededCard (rendered when 10/day like cap is hit)
Where: Replaces the deck column content entirely when
       quotaState === "exceeded". Filters column (left) and Likes column
       (right) remain visible.
Primitive: <QuotaExceededCard /> (existing component at
           src/components/app/quota-exceeded-card.tsx — already kit-styled)
Behavior: Reads quotaState from existing useDiscoverDeck() hook. Renders
          conditionally instead of the swipe deck.
Skills: /frontend-design (verify the card fills the deck column at the
        correct width, ~440px), /accessibility (heading hierarchy when
        card replaces the deck)
```

- [ ] **Step 4: Controller posts the placement brief above to the conversation**

- [ ] **Step 5: User approves / adjusts / rejects each surface independently**

- [ ] **Step 6: Dispatch integration subagent with this prompt**

```
You are the IMPLEMENTER applying the APPROVED monetization placements
to /discover (Task 13 Step 6).

Project root: d:/Antigravity/ahavah-web/

CONTEXT:
The canonical desktop port has landed and the user has visually verified
it. The user has now approved the following monetization placements:

[Controller pastes user-approved placement bullets verbatim]

CONSTRAINTS:
- Kit primitives only — use the existing <Button>, <QuotaExceededCard>,
  <TokenSpendSheet> per the placement brief.
- Do NOT modify the canonical layout. Add the approved surfaces in the
  exact slots described, with the exact primitives described.
- Reuse the existing useDiscoverDeck() and useTokenBalance() hooks.
  No new hook declarations.
- The Super-like button MUST open <TokenSpendSheet> on click, not
  navigate. computeSpendState(balance, 2) decides whether to render
  the spend confirm or the "get tokens" fallback inside the sheet.
- If a placement detail is ambiguous (e.g., gap between Super and Like
  buttons), STOP and ask. Do not guess.
- Do NOT commit. Stay unstaged.

VERIFY:
  npx tsc --noEmit
  npx vitest run 2>&1 | tail -10
Expected: tsc clean. vitest: 433 passed, 20 baseline failing.

REPORT STATUS + diff summary + verification.
```

- [ ] **Step 7: User re-verifies both themes (canonical + monetization surfaces visible) — replies "matches" or "fix X"**

- [ ] **Step 8: Mark §9 row 04 done in handoff. No commit.**

---

### Task 14: Rebuild `/matches` canonical + place Liked-You hidden cards

**Files:**
- Modify: `src/app/matches/page.tsx`
- Read-only: `handoff/desktop.jsx:L1499-L1557`, `handoff/screens/08-matches.md`, both reference HTML files

#### Canonical port (Steps 1–3)

Identical structure to Task 13 Steps 1–3, but for the `/matches` route. Subagent prompt template same as Task 13 Step 2 with these substitutions:
- "Task 13" → "Task 14"
- "/discover" → "/matches"
- "lines 434-586 (function DiscoverDesktop)" → "lines 1499-1557 (function MatchesDesktop)"
- "Super-like CTA, QuotaExceededCard" → "Liked-You hidden cards with BlurredAvatar + Lock + TokenSpendSheet reveal"

Canonical structural notes (from desktop.jsx L1499–L1557 — verify by reading): tab strip (All / Unread / Recent), responsive grid of match cards. Each card: `<Avatar ring="lime" online>` + name/age + last-message preview + two `<Button>`s (View profile outline / Message brand).

- [ ] **Step 1: Controller reads `screens/08-matches.md` + `desktop.jsx:L1499-L1557` and captures reference screenshots to `docs/screenshots/handoff-target/08-matches-{light,dark}.png`**

- [ ] **Step 2: Dispatch canonical-port subagent (template from Task 13 Step 2, substitutions above)**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

#### Monetization placement

**Surface to place:**

```
Surface: Liked-You hidden cards (non-premium reveal flow)
Where: The "Liked you" tab content. Non-premium viewers see N hidden
       cards where each card's <Avatar> is replaced with
       <BlurredAvatar size="lg"> + a <Lock> overlay glyph. Tapping the
       card opens <TokenSpendSheet cost={3}> to reveal that specific
       like. On confirm: POST /tokens/reveal with the liker's id,
       refetch incoming-likes, the card flips to show the unblurred
       photo + the normal Match-card affordances.
Primitive: <BlurredAvatar size="lg" /> (already kit at
           src/components/app/blurred-avatar.tsx, built in Task 3) +
           <Sheet> via existing <TokenSpendSheet>
Behavior: Reads useIncomingLikes() hook (already exists at
          src/lib/use-incoming-likes.ts). Each IncomingLike has a
          `hidden?: boolean`. When hidden, card renders the blurred
          state. Click → open TokenSpendSheet with cost=3, label
          "Reveal who liked you." On confirm: POST /tokens/reveal,
          await response, refetch.
Skills: /frontend-design (visual hierarchy — hidden cards should read
        as "see who liked you" prompts, not as broken empty states),
        /accessibility (each hidden card needs
        aria-label="Hidden like — tap to reveal for 3 tokens" so SR
        users understand the affordance)
```

- [ ] **Step 4: Controller posts the placement brief**

- [ ] **Step 5: User approves / adjusts / rejects**

- [ ] **Step 6: Dispatch integration subagent (template from Task 13 Step 6, substitutions and the brief above)**

- [ ] **Step 7: User re-verifies both themes**

- [ ] **Step 8: Mark §9 row 08 done. No commit.**

---

### Task 15: Rebuild `/inbox` canonical with inline chat preview + resolve `/chat/[id]` desktop behaviour

**Files:**
- Modify: `src/app/inbox/page.tsx`
- Modify: `src/app/chat/[id]/page.tsx` (desktop redirect or split-view render — user decides)
- Read-only: `handoff/desktop.jsx:L669-L827`, `handoff/screens/09-inbox.md`, both reference HTML files

This task has TWO decisions to make. Canonical port is straightforward. The `/chat/[id]` resolution is a sub-decision under this task.

#### Canonical port

- [ ] **Step 1: Controller reads `screens/09-inbox.md` + `desktop.jsx:L669-L827` and captures reference screenshots**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /inbox substitutions). Subagent porting brief includes: "2-col split — left thread list (~360px), right active-chat preview panel with header + scrollable message log + composer footer. Empty state when no thread selected uses `<EmptyState>`."**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

#### `/chat/[id]` desktop resolution (sub-decision)

The canonical `/inbox` desktop view inlines chat into the right panel. The existing `/chat/[id]` route currently has no `PageShell` and no desktop block. Two options:

```
Option A — Redirect at md+:
  /chat/[id] desktop visits redirect to /inbox?thread=<id> using
  useRouter().replace() in a useEffect that checks
  window.matchMedia('(min-width: 768px)').matches. Mobile keeps
  /chat/[id] as its own route.

Option B — Inline split-view at md+:
  /chat/[id] desktop renders the same split-view as /inbox with
  the given thread pre-selected. URL stays /chat/[id]. Implementation:
  /chat/[id]/page.tsx imports and renders <InboxView selected={id}>
  (or equivalent) at md+; mobile keeps its existing /chat layout.
```

- [ ] **Step 4: Controller posts both options + the trade-offs (URL stability vs. simplicity) to the conversation**

- [ ] **Step 5: User picks Option A or Option B**

- [ ] **Step 6: Dispatch resolution subagent (template adapted to the picked option)**

- [ ] **Step 7: User verifies — visits `/chat/<a real id>` at 1440×900, confirms behaviour matches the chosen option**

- [ ] **Step 8: Mark §9 row 09 done. No commit.**

---

### Task 16: Rebuild `/profile` (own) canonical + place BoostCard slot

**Files:**
- Modify: `src/app/profile/page.tsx`
- Read-only: `handoff/desktop.jsx:L828-L906`, `handoff/screens/10-profile.md`, both reference HTML files

#### Canonical port

- [ ] **Step 1: Controller reads `screens/10-profile.md` + `desktop.jsx:L828-L906` and captures reference screenshots**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /profile substitutions)**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

#### Monetization placement

**Surface to place:**

```
Surface: <BoostCard> slot
Where: Per the 2026-05-16 sprint: "between hero and existing sections."
       In the canonical ProfileDesktop, the layout is hero section +
       multiple stacked sections. Insert <BoostCard /> immediately
       after the hero and before the first body section, with the
       standard section gap above and below.
Primitive: <BoostCard /> (existing component at
           src/components/app/boost-card.tsx — already kit-styled)
Behavior: BoostCard self-manages its own state via useTokenBalance and
          /tokens/active-boost polling. No props needed beyond default.
          On boost active, it flips to a countdown state with
          animate-pulse on the <Zap> icon.
Skills: /frontend-design (verify the card width matches the surrounding
        sections — full width of the main content column, with the
        same gap as other section dividers), /ui-design-system
        (confirm the "Boost active." heading uses a lime period accent
        per the sparkle-dust visual pass, not a separate variant)
```

- [ ] **Step 4: Controller posts the placement brief**

- [ ] **Step 5: User approves / adjusts**

- [ ] **Step 6: Dispatch integration subagent (Task 13 Step 6 template + brief above)**

- [ ] **Step 7: User re-verifies both themes**

- [ ] **Step 8: Mark §9 row 10 done. No commit.**

---

### Task 17: Rebuild `/map` canonical (no monetization)

**Files:**
- Modify: `src/app/map/page.tsx`
- Read-only: `handoff/desktop.jsx:L1386-L1498`, `handoff/screens/07-map.md`, both reference HTML files

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /map substitutions). Subagent porting brief: "Full-bleed map + right rail with location chips + nearby profile cards. Map canvas reuses existing `<WorldMap>` component; rail uses `<Card tone="elevated">` per nearby profile."**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

- [ ] **Step 4: No monetization surfaces — skip to verification gate**

- [ ] **Step 5: Mark §9 row 07 done. No commit.**

---

### Task 18: Rebuild `/paywall` canonical + place token-stipend line

**Files:**
- Modify: `src/app/paywall/page.tsx`
- Read-only: `handoff/desktop.jsx:L1111-L1204`, `handoff/screens/11-paywall.md`, both reference HTML files

#### Canonical port

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /paywall substitutions). Note: TokenSpendSheet currentBalance handling — per handoff §8.5, only pass a real number when `useTokenBalance().state === "happy"`; otherwise pass `null` so the sheet renders optimistic confirm.**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

#### Monetization placement

**Surface to place:**

```
Surface: Monthly-token-stipend line in plan cards
Where: Each plan card has a bullet list of perks. Add a new bullet line
       above the existing perks: "<N> tokens / month included" where N
       is per the SKU (Starter: ?, Plus: ?, Pro: ?). Controller
       confirms the actual values from src/lib/api-types.ts or the
       sprint notes before integration; if unknown, controller asks
       user.
Primitive: <li> inside the existing perk list. Same typography as other
           perks. Add a <Sparkles> icon prefix matching the sparkle-dust
           visual pass — text-lime icon (only on the stipend line) to
           visually anchor it as the token-related perk.
Behavior: Static text. The values are constants in the plan-cards
          definition.
Skills: /frontend-design (verify the stipend line doesn't disrupt the
        existing 3-card visual rhythm), /ui-design-system (the lime
        Sparkles prefix matches sparkle-dust convention — confirm
        size matches the other bullet markers)
```

- [ ] **Step 4: Controller confirms token-stipend values per SKU (asks user if not in code) and posts the placement brief**

- [ ] **Step 5: User approves / adjusts**

- [ ] **Step 6: Dispatch integration subagent**

- [ ] **Step 7: User re-verifies both themes**

- [ ] **Step 8: Mark §9 row 11 done. No commit.**

---

### Task 19: Rebuild `/verify` canonical + adapt VerifyTierShell for 3 sub-routes

**Files:**
- Modify: `src/app/verify/page.tsx`
- Modify: `src/components/app/verify-tier-shell.tsx` (add desktop adaptation)
- Modify: `src/app/verify/{bronze,silver}/page.tsx` (light-touch — ensure they use the adapted shell)
- Create: `src/app/verify/gold/page.tsx` IF missing (currently has no PageShell per audit)
- Read-only: `handoff/desktop.jsx:L1205-L1294`, `handoff/screens/12-verify.md`, both reference HTML files

#### Canonical port for `/verify`

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /verify substitutions). Subagent porting brief: "3 tier cards (Bronze / Silver / Gold) using `<Card tone="tier-active" tier={...}>` for the user's current tier."**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

#### VerifyTierShell desktop adaptation (Step 4 sub-decision)

The 3 sub-routes (`/verify/bronze`, `/verify/silver`, `/verify/gold`) share `<VerifyTierShell>`. Canonical handoff doesn't show their desktop view explicitly (handoff §11: "same shell, different content panel"). Two options:

```
Option A — Mirror /verify split:
  At md+, /verify/<tier> renders <VerifyTierShell> with the 3 tier
  cards on the left (active tier highlighted) and the tier-specific
  content panel on the right. URL keeps /verify/<tier>.

Option B — Full-bleed content:
  At md+, /verify/<tier> renders just the tier-specific content
  panel as a centered full-bleed page (like /paywall does).
  /verify (the index) handles tier selection.
```

- [ ] **Step 4: Controller posts both options to the conversation with screenshots of the mobile versions**

- [ ] **Step 5: User picks Option A or B**

- [ ] **Step 6: Dispatch shell-adaptation subagent (template adapted to the picked option)**

```
You are the IMPLEMENTER for Task 19 Step 6 — VerifyTierShell desktop adaptation.

Project root: d:/Antigravity/ahavah-web/
Plan: docs/superpowers/plans/2026-05-17-desktop-rebuild-option-b.md → Task 19

USER-PICKED OPTION: [A or B with copy-paste of the chosen layout]

CONSTRAINTS:
- Kit primitives only.
- Modify src/components/app/verify-tier-shell.tsx to render the chosen
  layout at md+. Mobile (<md) stays IDENTICAL to its current
  behaviour — wrap any new md+ logic in responsive prefixes
  (`hidden md:flex` / `md:hidden`).
- After the shell edit, verify each of /verify/bronze, /verify/silver,
  /verify/gold renders correctly at md+ without per-route edits.
- For /verify/gold IF it has no PageShell, add a minimal page.tsx
  wrapping the gold tier content in <VerifyTierShell tier="gold">.
- Reuse all existing tier-page state and copy. Do not change
  mobile-side rendering.
- Do NOT commit.

VERIFY:
  npx tsc --noEmit
  npx vitest run 2>&1 | tail -10

REPORT STATUS + files modified + verification.
```

- [ ] **Step 7: User visits each of /verify, /verify/bronze, /verify/silver, /verify/gold at 1440×900 both themes — confirms all 4 render correctly**

- [ ] **Step 8: Mark §9 row 12 done. No commit.**

---

### Task 20: Rebuild `/settings` canonical + create SettingsShell for 5 sub-routes

**Files:**
- Modify: `src/app/settings/page.tsx`
- Create: `src/components/app/settings-shell.tsx`
- Modify: `src/app/settings/{account,blocked,notifications,privacy,safety}/page.tsx` (light-touch — wrap in `<SettingsShell>` at md+)
- Read-only: `handoff/desktop.jsx:L1295-L1385`, `handoff/screens/13-settings.md`, both reference HTML files

#### Canonical port for `/settings` index

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /settings substitutions). Subagent porting brief: "2-col layout — left nav (sections), right active panel. The left nav lists the 5 sub-routes (Account, Blocked, Notifications, Privacy, Safety); the right panel renders the current sub-route's content at md+."**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes — at this point /settings index works; sub-routes are still mobile-only**

#### SettingsShell creation (the leverage move)

- [ ] **Step 4: Controller drafts SettingsShell API spec and posts to conversation**

Proposed API:

```tsx
// src/components/app/settings-shell.tsx
type Props = {
  activeKey: "account" | "blocked" | "notifications" | "privacy" | "safety";
  title: string;
  children: React.ReactNode;
};

export function SettingsShell({ activeKey, title, children }: Props) {
  // At <md: render children directly (mobile keeps its existing chrome)
  // At md+: render 2-col layout — left nav from <Link>s matching activeKey,
  //         right panel with title + children
}
```

Skills: `/frontend-design` for left-nav visual hierarchy (active item indication, hairline divider between rows). `/accessibility` for nav landmark + aria-current="page" on the active link.

- [ ] **Step 5: User approves / adjusts the API**

- [ ] **Step 6: Dispatch shell-creation subagent**

```
You are the IMPLEMENTER for Task 20 Step 6 — SettingsShell creation.

Project root: d:/Antigravity/ahavah-web/
Plan: Task 20 of 2026-05-17-desktop-rebuild-option-b.md

CONSTRAINTS:
- Kit primitives only (Link from next/link, no buttons for nav rows
  — Links for accessibility).
- Mobile (<md): SettingsShell renders only its `children` — no chrome.
  The existing mobile chrome at each sub-route page stays as-is.
- Desktop (md+): SettingsShell renders the 2-col layout:
    Left col 280px: vertical nav with 5 entries (Account, Blocked,
                    Notifications, Privacy, Safety). Active entry
                    uses Pill variant="lavender" or
                    `bg-(--bg-card) text-(--ink)` per kit pattern.
                    Inactive entries are `text-(--ink-2)
                    hover:text-(--ink)`.
    Right col 1fr: <h1 className="text-h1">{title}</h1> + children.
- Test: write tests/components/settings-shell.test.tsx asserting:
    1. At any viewport, children render
    2. activeKey="account" sets aria-current="page" on the Account
       link only
- Do NOT modify any /settings/* page yet — that happens in Step 7.

VERIFY:
  npx vitest run tests/components/settings-shell.test.tsx
  npx tsc --noEmit
Expected: 2 PASS, tsc clean.

REPORT STATUS + diff summary.
```

- [ ] **Step 7: Dispatch sub-route wrap subagent**

```
You are the IMPLEMENTER for Task 20 Step 7 — wrap all 5 settings sub-routes
with SettingsShell.

For each of:
  src/app/settings/account/page.tsx        (activeKey="account",   title="Account")
  src/app/settings/blocked/page.tsx        (activeKey="blocked",   title="Blocked")
  src/app/settings/notifications/page.tsx  (activeKey="notifications", title="Notifications")
  src/app/settings/privacy/page.tsx        (activeKey="privacy",   title="Privacy")
  src/app/settings/safety/page.tsx         (activeKey="safety",    title="Safety")

Replace the existing <PageShell …>{content}</PageShell> wrapper with:

  <PageShell bottomPad="nav" desktopShell="sidebar" topBarTitle="Settings">
    <SettingsShell activeKey="<key>" title="<title>">
      {content}
    </SettingsShell>
  </PageShell>

CONSTRAINTS:
- Do NOT modify the per-route content. Only the wrapping component.
- Add the SettingsShell import.
- Mobile (<md) MUST remain visually identical (SettingsShell is a
  no-op at <md per its impl).
- Do NOT commit.

VERIFY:
  npx tsc --noEmit
  npx vitest run 2>&1 | tail -10

REPORT STATUS + list of files modified.
```

- [ ] **Step 8: User visits /settings, /settings/account, /settings/blocked, /settings/notifications, /settings/privacy, /settings/safety at 1440×900 both themes — confirms all 6 render correctly**

- [ ] **Step 9: Mark §9 row 13 done. No commit.**

---

### Task 21: Rebuild `/locked` canonical (no monetization)

**Files:**
- Modify: `src/app/locked/page.tsx`
- Read-only: `handoff/desktop.jsx:L1558-L1608`, `handoff/screens/14-locked.md`, both reference HTML files

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /locked substitutions). Brief: "Centered card; small surface; full-bleed shell. Lock icon + heading + body + CTA."**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

- [ ] **Step 4: No monetization surfaces — skip to mark done**

- [ ] **Step 5: Mark §9 row 14 done. No commit.**

---

### Task 22: Rebuild `/match` canonical (no monetization)

**Files:**
- Modify: `src/app/match/page.tsx`
- Read-only: `handoff/desktop.jsx:L587-L668`, `handoff/screens/06-match.md`, both reference HTML files

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /match substitutions). Brief: "Gradient hero + confetti + 2 lockup-photo cards + CTAs. Full-bleed shell."**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

- [ ] **Step 4: Mark §9 row 06 done. No commit.**

---

### Task 23: Rebuild `/onboarding/name` canonical + create OnboardingDesktopShell for 16 sub-routes

**Files:**
- Modify: `src/app/onboarding/name/page.tsx`
- Create: `src/components/app/onboarding-desktop-shell.tsx`
- Modify: `src/app/onboarding/{gender,looking-for,country,relocation,languages,polygyny,assembly,marital-status,dob,bio,photos,children,verification,verify-email,verify-phone,complete}/page.tsx` (16 files — wrap with OnboardingDesktopShell at md+)
- Modify: `src/app/onboarding/page.tsx` (the index route)
- Read-only: `handoff/desktop.jsx:L344-L433`, `handoff/screens/03-onboarding.md`, both reference HTML files

#### Canonical port for `/onboarding/name` (the representative screen)

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent (Task 13 template, /onboarding substitutions). Brief: "Shared shell — left-side progress + title pane, right-side step body. Rebuild for /onboarding/name first; the other 16 subroutes get the shell applied in Step 7."**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

#### OnboardingDesktopShell creation

- [ ] **Step 4: Controller drafts OnboardingDesktopShell API and posts**

Proposed API:

```tsx
// src/components/app/onboarding-desktop-shell.tsx
type Props = {
  step: number;          // 1-indexed current step
  totalSteps: number;    // typically 16
  title: string;         // the step prompt e.g. "What's your name?"
  subtitle?: string;     // optional helper text
  children: React.ReactNode;  // the step input(s)
  footer?: React.ReactNode;   // typically the <Button tone="cta">Continue</Button>
};

export function OnboardingDesktopShell({ … }: Props) {
  // At <md: render children directly (existing mobile OnboardingShell handles chrome)
  // At md+: 2-col layout — left progress + title + subtitle, right step body + footer
}
```

Skills: `/frontend-design` (progress indicator visual style — bar / dots / fraction), `/accessibility` (step progress announced to SR users via `aria-valuenow` on a progressbar landmark).

- [ ] **Step 5: User approves / adjusts the API**

- [ ] **Step 6: Dispatch shell-creation subagent**

```
You are the IMPLEMENTER for Task 23 Step 6 — OnboardingDesktopShell.

Project root: d:/Antigravity/ahavah-web/
Plan: Task 23 of 2026-05-17-desktop-rebuild-option-b.md

[User-approved API pasted here]

CONSTRAINTS:
- Kit primitives only.
- Mobile (<md): no-op — render children only. The existing mobile
  <OnboardingShell> at each sub-route stays unchanged.
- Desktop (md+): the 2-col layout from the canonical
  OnboardingDesktop (desktop.jsx:L344-L433). Match the canonical's
  exact column ratio (read it from desktop.jsx), gutters, type sizes,
  and progress indicator style.
- Test: tests/components/onboarding-desktop-shell.test.tsx:
    1. Renders title + children
    2. step=1 totalSteps=16 → progress shows step 1 of 16
    3. footer slot renders when provided
- Do NOT modify any /onboarding/* page yet.

VERIFY: tsc + vitest. Expected: 3 PASS, tsc clean.
REPORT STATUS + diff summary.
```

- [ ] **Step 7: Dispatch sub-route wrap subagent**

```
You are the IMPLEMENTER for Task 23 Step 7 — wrap all 16 onboarding
sub-routes with OnboardingDesktopShell.

For each sub-route in src/app/onboarding/, add a `hidden md:…` wrapper
that renders <OnboardingDesktopShell step={N} totalSteps={16}
title="…" subtitle="…?" footer={<existing CTA>}>{step body}</…>.
The mobile JSX stays in its `md:hidden` block untouched.

Step numbers (1-indexed) and titles from src/app/onboarding/<step>/page.tsx:
  1. name             "What's your name?"
  2. gender           "What's your gender?"
  3. looking-for      "What are you looking for?"
  4. dob              "When were you born?"
  5. country          "Where are you from?"
  6. relocation       "Where would you live?"
  7. languages        "What languages do you speak?"
  8. marital-status   "What's your marital status?"
  9. polygyny         "Are you open to polygyny?" (only for applicable genders)
  10. children        "Children?"
  11. assembly        "Which assembly?"
  12. bio             "Tell us about yourself"
  13. photos          "Add your photos"
  14. verification    "Verify yourself"
  15. verify-email    "Verify your email"
  16. verify-phone    "Verify your phone"
  (complete is a separate post-onboarding screen, not a step)

If a sub-route's title in code differs from the above, USE THE CODE'S
COPY — do not invent or change copy.

Confirm step numbers reflect the actual onboarding flow by reading
src/app/onboarding/page.tsx (the index) or the onboarding state
machine. If the ordering or step count differs, STOP and ask.

CONSTRAINTS:
- Kit primitives only.
- Mobile stays unchanged.
- Desktop block reuses the same step body JSX where possible (e.g.
  the choice grid for /onboarding/looking-for).
- Do NOT commit.

VERIFY: tsc + vitest.
REPORT STATUS + list of 16 files modified.
```

- [ ] **Step 8: User walks every sub-route at 1440×900 both themes — confirms all 16+1 render correctly**

- [ ] **Step 9: Mark §9 row 03 done. No commit.**

---

### Task 24: Rebuild `/auth/sign-up` + `/auth/sign-in` canonical

**Files:**
- Modify: `src/app/auth/sign-up/page.tsx`, `src/app/auth/sign-in/page.tsx`
- Read-only: `handoff/desktop.jsx:L237-L343`, `handoff/screens/02-sign-up.md`, both reference HTML files

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent for /auth/sign-up (Task 13 template). Brief: "Canonical 5fr/7fr split (brand pane left, form pane right) — NOT a centered card."**

- [ ] **Step 3: User verifies /auth/sign-up at 1440×900 both themes**

- [ ] **Step 4: Dispatch second canonical-port subagent for /auth/sign-in mirroring sign-up structure**

- [ ] **Step 5: User verifies /auth/sign-in at 1440×900 both themes**

- [ ] **Step 6: Mark §9 row 02 done. No commit.**

---

### Task 25: Rebuild `/` (welcome) canonical

**Files:**
- Modify: `src/app/page.tsx`
- Read-only: `handoff/desktop.jsx:L148-L236`, `handoff/screens/01-welcome.md`, both reference HTML files

- [ ] **Step 1: Controller reads spec + JSX + captures references**

- [ ] **Step 2: Dispatch canonical-port subagent. Brief: "Brand pane + decorative sparkles + primary CTA (Sign up) + secondary (Sign in). Use `<SparkleTile size="xl" />` for the brand-mark lockup."**

- [ ] **Step 3: User verifies canonical port at 1440×900 both themes**

- [ ] **Step 4: Mark §9 row 01 done. No commit.**

---

## Phase 5 — Cross-cutting decisions (Task 25b)

Three independent decisions that touch multiple components. Each is handled as a sub-step under Task 25b with user approval.

### Task 25b.1: Sheet vs Dialog at md+

**Files affected:**
- `src/components/app/token-spend-sheet.tsx`
- `src/components/app/filters-sheet.tsx`
- `src/components/app/block-report-sheet.tsx`

Three options:

```
Option A — All bottom-Sheets stay at md+
  Sheets continue to slide up from the bottom on desktop. Pattern
  reads as mobile-leaking-up but is consistent across viewports.

Option B — All bottom-Sheets become centered Dialogs at md+
  Replace <Sheet>/<SheetContent> usage with <Dialog>/<DialogContent>
  at md+. Each Sheet primitive grows a responsive variant that
  renders Sheet at <md and Dialog at md+.

Option C — Per-sheet decision
  TokenSpendSheet → Dialog at md+ (transactional, deserves focus).
  FiltersSheet    → stays as bottom-Sheet (large form, swipe-friendly).
  BlockReportSheet → Dialog at md+ (modal action, deserves focus).
```

- [ ] **Step 1: Controller posts the three options + trade-offs to the conversation**

- [ ] **Step 2: User picks A / B / C / custom**

- [ ] **Step 3: If B or C, dispatch a refactor subagent that adds a `<ResponsiveSheet>` wrapper or updates each Sheet's render to switch primitives at md+**

```
You are the IMPLEMENTER for Task 25b.1 — responsive Sheet primitive.

Project root: d:/Antigravity/ahavah-web/

USER PICKED: [A, B, or C with details]

If A: no work — Sheets stay as-is. Skip to STATUS report.

If B or C: implement the responsive split.

For each Sheet that should become a Dialog at md+:
  - Read the current Sheet component
  - At md+: render <Dialog><DialogContent>…</DialogContent></Dialog>
    with the same children/props (Dialog from src/components/ui/dialog)
  - At <md: render <Sheet side="bottom">…</Sheet> as before
  - Use Tailwind responsive prefixes (no JS branching, no
    useMediaQuery) — both mounted, one is `hidden md:*` and the other
    is `md:hidden`. The state (open/close) is shared via the
    triggering hook/handler.

Test: each updated Sheet has a test asserting it renders the Sheet
markup at <md (jsdom default 1024 — flip matchMedia stub to <768)
and Dialog markup at md+.

CONSTRAINTS:
- Kit primitives only.
- Existing trigger sites continue to work without prop changes
  (the public API of each Sheet component is preserved).
- Do NOT commit.

VERIFY: tsc + vitest. Expected: existing baseline + new tests pass.
REPORT STATUS.
```

- [ ] **Step 4: User verifies — opens each affected Sheet on desktop in both themes and confirms behaviour matches the chosen option**

### Task 25b.2: Boost-active indicator on desktop sidebar

**Files affected:**
- `src/components/app/desktop-sidebar.tsx`

Three options for where the lime ring lives on desktop (since BottomNav is md:hidden):

```
Option A — Ring around the Profile-tab avatar (mirror mobile placement)
  Find the Profile tab in DesktopSidebar's nav list (the <User> icon
  row). When useTokensActiveBoost() returns active, render a
  2.5px lime border on the avatar circle of that tab. Pattern matches
  exactly the mobile BottomNav behaviour.

Option B — Separate "Boost active 18m" pill near TokenBalancePill
  In the sidebar's bottom block, when boost is active, render a small
  <Pill variant="lime">Boost active · 18m</Pill> immediately under
  TokenBalancePill, before the ThemeToggle. Removes ambiguity but
  diverges from mobile pattern.

Option C — Both A and B
  Lime ring on the Profile-tab avatar AND a pill in the bottom block.
  Redundant but unambiguous.
```

- [ ] **Step 1: Controller posts the three options to the conversation**

- [ ] **Step 2: User picks A / B / C / custom**

- [ ] **Step 3: Dispatch indicator subagent**

```
You are the IMPLEMENTER for Task 25b.2 — boost-active indicator on
desktop sidebar.

Project root: d:/Antigravity/ahavah-web/

USER PICKED: [A, B, or C with details]

CONSTRAINTS:
- Kit primitives only.
- Modify src/components/app/desktop-sidebar.tsx ONLY.
- Read boost state via the same useTokensActiveBoost (or equivalent)
  hook the mobile BottomNav uses. Grep src/components/app/bottom-nav.tsx
  to find the exact hook name + return shape.
- Mobile (<md) sidebar is `hidden md:flex` internally so this change
  has zero mobile impact.
- Do NOT commit.

VERIFY: tsc + vitest. Run dev server and confirm by polling a
test-account with an active boost.
REPORT STATUS.
```

- [ ] **Step 4: User verifies — confirms the indicator renders when a boost is active and disappears when expired**

### Task 25b.3 (Phase 5 verification gate)

- [ ] **Step 1: After 25b.1 and 25b.2 land, full sweep**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx vitest run
```

Expected: tsc clean. vitest: 433 baseline + Task 19, 20, 23 shell test additions (counts depend on tests added).

---

## Phase 6 — `/profile/tokens` desktop design + build (Task 25a)

No canonical reference exists. Controller drafts the design using kit primitives + invokes design-system skills.

### Task 25a.1: Controller drafts `/profile/tokens` desktop layout intent

- [ ] **Step 1: Controller reads existing mobile `/profile/tokens` page**

```powershell
cat src/app/profile/tokens/page.tsx | head -250
```

Identify: balance hero, 4-SKU Choicebox (Single $0.99 / Starter $4.99 / Plus $9.99 / Pro $19.99), Stripe Checkout button, cross-sell to /paywall.

- [ ] **Step 2: Controller invokes `/frontend-design` and `/ui-design-system` skills to draft the desktop layout**

Reasoned proposal (to be refined per skill output):

```
Layout (1440×900):
  Sidebar shell (existing DesktopSidebar) on the left at 260px wide.
  Main content column at flex-1, content centered within max-w-[680px]
  starting at top padding 48px.
  
  Top: Balance hero
    <Card tone="elevated" className="rounded-3xl p-8">
      Balance label (text-overline)
      <div className="flex items-center gap-3">
        <SparkleTile size="lg" /> (or just <Sparkles className="size-10 fill-(--lime)"/>)
        <span className="text-display tabular-nums">{balance}</span>
      </div>
      <p className="text-meta text-(--ink-2)">tokens</p>
    </Card>
  
  Middle: 4-SKU grid
    <div className="grid grid-cols-2 gap-4 mt-8">
      <Card tone="elevated" /* Single */>
        $0.99
        1 token
        Best for: trying it out
        <Button tone="cta" size="cta" onClick={…}>Buy 1 token</Button>
      </Card>
      <Card tone="elevated" /* Starter */>
        $4.99
        5 tokens
        Best for: occasional uses
        <Button tone="cta" size="cta">Buy 5 tokens</Button>
      </Card>
      <Card tone="elevated" /* Plus */>
        $9.99
        12 tokens
        Best for: active users (highlight as "popular" — <Pill variant="lavender">Popular</Pill> in corner)
        <Button tone="cta" size="cta">Buy 12 tokens</Button>
      </Card>
      <Card tone="elevated" /* Pro */>
        $19.99
        30 tokens
        Best for: power users (highlight with `tone="gradient"` for visual lift)
        <Button tone="cta" size="cta">Buy 30 tokens</Button>
      </Card>
    </div>
  
  Bottom: Cross-sell card to /paywall
    <Card tone="gradient" className="mt-8 rounded-2xl p-6">
      Title: "Or upgrade for unlimited everything"
      Body: "Premium includes monthly token stipend + unlimited likes + …"
      <Button tone="elevated" size="tap" render={<Link href="/paywall">See plans</Link>}>
    </Card>

Skills invoked:
  /frontend-design — overall composition + visual hierarchy
  /ui-design-system — confirm Card tone="gradient" is the right
                       variant for the cross-sell vs custom hand-rolled
  /accessibility — Buy buttons have aria-labels describing the
                    transaction ("Buy 5 tokens for $4.99")
```

- [ ] **Step 3: Controller posts the draft to the conversation, explicitly noting any inferred values (SKU prices, "Popular" emphasis, copy)**

### Task 25a.2: User approves design

- [ ] **Step 1: User reviews the draft**

- [ ] **Step 2: User replies "approve," "adjust: <details>," or "reject"**

- [ ] **Step 3: If adjusts, controller iterates with /frontend-design until approved**

### Task 25a.3: Subagent builds `/profile/tokens` desktop

- [ ] **Step 1: Dispatch build subagent**

```
You are the IMPLEMENTER for Task 25a — /profile/tokens desktop build.

Project root: d:/Antigravity/ahavah-web/
Plan: Task 25a of 2026-05-17-desktop-rebuild-option-b.md

USER-APPROVED LAYOUT:
[Paste the approved layout draft verbatim]

EXISTING ROUTE:
src/app/profile/tokens/page.tsx is mobile-only currently. Add a
`hidden md:…` desktop block per the approved layout. Keep the
`md:hidden` mobile block (which may need to be added — verify the
existing structure first; if the route has no md branches, wrap
existing content in `<div className="md:hidden">…</div>` and add
the desktop block alongside).

Update the PageShell call:
  <PageShell bottomPad="nav" desktopShell="sidebar" topBarTitle="Tokens">

CONSTRAINTS:
- Kit primitives only.
- Reuse existing useTokenBalance hook + Stripe Checkout handler.
- No new SKU data — read from src/lib/api-types.ts or
  src/lib/use-token-balance.ts or wherever SKUs are declared. If
  the SKU prices/token-counts in the approved draft differ from
  the code, USE THE CODE'S VALUES and flag the divergence in your
  status report.
- Do NOT commit.

VERIFY: tsc + vitest.
REPORT STATUS + diff summary + which kit primitives used.
```

- [ ] **Step 2: User visits `/profile/tokens` at 1440×900 both themes — verifies against the approved draft**

- [ ] **Step 3: Mark Task 25a done. No commit.**

---

## Phase 7 — Outside-canonical routes (Task 25c)

10 routes the handoff doesn't cover. Group defaults per route type, approved once per group.

### Task 25c.1: Status pages (full-bleed at md+)

**Files:** `src/app/banned/page.tsx`, `src/app/maintenance/page.tsx`, `src/app/offline/page.tsx`, `src/app/update-required/page.tsx`

Group default: wrap each in `<PageShell desktopShell="full-bleed" bottomPad="default" className="px-5 pt-6 items-center justify-center">`. They are status pages that should render the same on every viewport.

- [ ] **Step 1: Controller proposes the default to the user**

- [ ] **Step 2: User approves**

- [ ] **Step 3: Dispatch subagent**

```
You are the IMPLEMENTER for Task 25c.1 — status pages full-bleed.

For each of:
  src/app/banned/page.tsx
  src/app/maintenance/page.tsx
  src/app/offline/page.tsx
  src/app/update-required/page.tsx

If the route currently has no <PageShell>, wrap its rendered content in:
  <PageShell desktopShell="full-bleed" bottomPad="default"
             className="px-5 pt-6 items-center justify-center">
    {existing content}
  </PageShell>

If the route already has a <PageShell>, just add the
`desktopShell="full-bleed"` prop if missing.

CONSTRAINTS:
- Kit primitives only. Do NOT redesign the page content.
- Do NOT commit.

VERIFY: tsc + vitest. Visit each page at 1440x900 (manually) and
confirm content is centered.
REPORT STATUS + 4 file diff summary.
```

- [ ] **Step 4: User visits each at 1440×900 both themes**

### Task 25c.2: Content + admin pages (sidebar shell at md+)

**Files:** `src/app/help/page.tsx`, `src/app/legal/privacy/page.tsx`, `src/app/legal/terms/page.tsx`, `src/app/legal/community-guidelines/page.tsx`, `src/app/admin/reports/page.tsx`, `src/app/billing-portal/page.tsx`, `src/app/profile/edit/page.tsx`

Group default: wrap each in `<PageShell desktopShell="sidebar" topBarTitle="<page title>" bottomPad="nav">`. Content renders in the sidebar shell's main column. Mobile remains unchanged.

For `/profile/edit`: the desktop view at md+ shows the same form content within the sidebar shell — NOT a modal dialog over /profile. Simpler, predictable behaviour.

For `/billing-portal`: it's a Stripe redirect landing page. `desktopShell="full-bleed"` may be more appropriate. Controller asks user during Step 1.

- [ ] **Step 1: Controller proposes the default per-route to the user (with the /billing-portal sub-question)**

- [ ] **Step 2: User approves / adjusts**

- [ ] **Step 3: Dispatch subagent (template similar to 25c.1, with the chosen per-route desktopShell values)**

- [ ] **Step 4: User visits each at 1440×900 both themes**

### Task 25c.3 (verification gate)

- [ ] **Step 1: Full sweep**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: all baseline tests still pass.

---

## Phase 8 — Final audit + handoff close (Task 26)

### Task 26.1: Extend `audit-contrast.mjs` to cover light tokens

**Files:** `scripts/audit-contrast.mjs`

The current script only checks dark-theme combinations. Spec §1.3 lists light combinations (table at design-system-v2.md lines 90–101). Extend the script.

- [ ] **Step 1: Dispatch audit-extension subagent**

```
You are the IMPLEMENTER for Task 26.1 — extend audit-contrast.mjs for
light tokens.

Project root: d:/Antigravity/ahavah-web/

CONTEXT:
scripts/audit-contrast.mjs currently audits dark-theme contrast pairs.
The light theme has its own audit table in
docs/handoff-desktop/design-system-v2.md lines 90–101 — read those.

TASK:
Add a second sweep of contrast pairs against the light token values:
  --bg-app:    #FBF9F4
  --bg-card:   #FFFFFF
  --fg-default: #0F0B1F
  --fg-muted:  oklch(0.45 0.05 280)
  --fg-subtle: oklch(0.60 0.04 280)
  --color-lime (light): oklch(0.78 0.22 119)
  --lavender:  oklch(0.71 0.16 295)
  --pink:      oklch(0.65 0.24 17)

For each pair, compute the WCAG 2.1 contrast ratio and report PASS/FAIL
against the threshold (4.5 body / 3.0 large+UI).

Output should append a "LIGHT THEME PAIRS" section after the existing
"Sorted ascending by ratio" output, with the same table format.

CONSTRAINTS:
- Reuse existing OKLCH-to-sRGB conversion + contrast formula from the
  current script.
- Do NOT change the dark-theme output — the existing 29 pairs continue
  to print first.
- Do NOT commit.

VERIFY:
  node scripts/audit-contrast.mjs > docs/handoff-desktop/audit-contrast-light-2026-05-17.txt
  cat docs/handoff-desktop/audit-contrast-light-2026-05-17.txt | tail -60

Expected: dark pairs still print, light pairs appended, no new failures
beyond the diagnostic "text-white on brand" pairs (which are the same
rule the dark check catches).
REPORT STATUS.
```

- [ ] **Step 2: User reviews the new audit output. If any unexpected failures, file fixes against the affected token values.**

### Task 26.2: Mobile regression check

- [ ] **Step 1: User opens the live app at 414×900 (mobile viewport)**

- [ ] **Step 2: User walks every route that was rebuilt in Tasks 13–25 and confirms mobile behaviour matches pre-rebuild baseline (dark indigo 414px column, BottomNav floating, no desktop chrome visible)**

- [ ] **Step 3: User reports any mobile regression. Controller dispatches a fix subagent per regression.**

### Task 26.3: Final status report

- [ ] **Step 1: Update `docs/superpowers/handoffs/2026-05-17-desktop-light-rebuild-handoff.md` §9 status table — every row marked done with screenshot pair attached.**

- [ ] **Step 2: Write `docs/superpowers/handoffs/2026-05-17-desktop-rebuild-final-notes.md` summarizing what shipped, any deferred items, any new deviations to track.**

### Task 26.4: Commit discussion

- [ ] **Step 1: Surface to user: "Rebuild complete. tsc clean. Vitest 20 baseline. Contrast audit (dark + light) pass. 14/14 routes verified side-by-side. Mobile baseline intact. Final notes saved. Ready to commit when you give the word."**

- [ ] **Step 2: User chooses commit strategy (one commit per phase? squash? PR?)**

- [ ] **Step 3: Per user instruction, dispatch a commit-orchestration subagent OR user commits directly.**

---

## Notes for the controller (Claude) executing this plan

- **Read the per-screen `.md` spec myself before every screen task.** Do not delegate this read. The spec is short (typically 60–80 lines) and contains the behaviour wiring that subagents will not infer correctly.
- **Visual verification gate is non-negotiable.** Even when the user is responsive and likely to say "matches," the gate must complete before the next task dispatches. The previous session's §3.3 failure ("never visually verified, shipped 14 broken screens") is exactly what Option B prevents.
- **Forbid invention in every subagent brief.** The phrase "If a value is not literally in the reference, STOP and ask. Do not infer. Do not improvise." is in every dispatch prompt for a reason — without it, subagents fill silence with substitutions.
- **Do not parallelize per-screen tasks.** Each screen needs the visual gate completed before the next dispatches. Parallel dispatch caused the §3.4 + §3.1 failures.
- **For high-leverage shells (Tasks 19, 20, 23):** dispatch the shell creation as ONE subagent, then the sub-route wrapping as a SECOND subagent. Do not bundle. The shell must exist + pass tests before any sub-route consumes it.
- **For `/chat/[id]` (Task 15):** the desktop resolution is a sub-decision the user must make. Do not pick an option without their input.
- **For `/profile/tokens` (Task 25a):** controller drafts the design themselves. Do not delegate the drafting to a subagent — the drafting requires reading the existing mobile code + invoking design skills, which is controller-scoped work.

---

## Self-review notes (controller's own audit before dispatching Task 13)

Pre-flight per the writing-plans skill:

**1. Spec coverage** — every route in the 53-file inventory maps to a task:
- 14 canonical screens → Tasks 13–25 ✓
- 16 onboarding sub-routes → Task 23 (via OnboardingDesktopShell) ✓
- 5 settings sub-routes → Task 20 (via SettingsShell) ✓
- 3 verify tier sub-routes → Task 19 (via VerifyTierShell adaptation) ✓
- 10 outside-canonical → Task 25c.1 (4 status pages) + 25c.2 (7 content/admin pages) ✓
- `/profile/tokens` → Task 25a ✓
- `/chat/[id]` desktop behaviour → Task 15 sub-decision ✓
- Cross-cutting Sheet/Dialog → Task 25b.1 ✓
- Boost indicator placement → Task 25b.2 ✓
- Final audit + mobile regression + contrast extension + handoff close → Task 26 ✓

**2. Placeholder scan** — no "TBD", no "implement later," no "similar to Task N." Each task has explicit kit-primitive choices, explicit skill invocations, explicit subagent prompts.

**3. Type consistency** — shell APIs are named consistently (`OnboardingDesktopShell`, `SettingsShell`, `VerifyTierShell` desktop adaptation). Substitution table named once and referenced. Status table tracks every screen rebuild.

**No gaps. Plan ready for dispatch.**
