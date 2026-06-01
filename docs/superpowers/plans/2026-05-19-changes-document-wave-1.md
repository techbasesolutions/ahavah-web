# Ahavah Changes (PDF 2026-05-19) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Inline execution is allowed for Phase A-D; F + G should be considered for separate plans before execution.

**Goal:** Resolve every item in the 2-page "Ahavah Changes" PDF (2026-05-19) without shortcuts, design violations, drift, or hand-rolled chrome. **18 of the 20 items** are covered here (Wave 1). The remaining 2 — chat reactions + billing portal rebuild — have separate plan stubs at [docs/superpowers/plans/2026-05-19-chat-reactions.md](docs/superpowers/plans/2026-05-19-chat-reactions.md) and [docs/superpowers/plans/2026-05-19-billing-portal-rebuild.md](docs/superpowers/plans/2026-05-19-billing-portal-rebuild.md) per user direction.

**Architecture:** Five phases, ordered low-risk → medium-risk. Phases A-D ship safely as a single push (copy + icon consistency + small bug fixes + Discover polish). Phase E (profile fields) gates on user-input scope decision after the canonical-vs-current audit.

**Tech Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui (Base UI variant) + Kibo UI + Plus Jakarta Sans + Ultra display. Backend = Flask + Postgres (`ahavah-api` repo). Stripe (test mode) for billing.

---

## Hard rules for execution

1. **Kit primitives only.** Every UI element MUST be a kit component (shadcn/ui, Kibo, `components/app/*`). NEVER hand-rolled `<div className="">` atoms. Layout-only divs (flex/grid/positioning) are allowed.
2. **Skills invoked before new UI.** For any task that introduces or significantly modifies a UI surface, invoke `frontend-design:frontend-design` and `mobile-responsive` BEFORE coding (per user direction 2026-05-19).
3. **Source-of-truth-first.** Before changing any visual surface, locate the canonical design (HTML in `Landing Page/Ahavah-handoff/`, JSX in `Landing Page/Ahavah-mobile/.../screens.jsx`, or `.md` spec in `docs/handoff-desktop/screens/`). Implement from canonical; if no canonical exists, document the gap and propose design before coding.
4. **Verify before claiming done.** `npx tsc --noEmit` clean, route serves 200, and user browser-verifies. Build/typecheck = compiles, not looks-right.
5. **No em-dashes in user-facing strings** (per [[feedback_no_em_dashes]]). Plan tasks themselves may use em-dashes — only USER-FACING strings are restricted.
6. **Commits stay topical.** One commit per task (or sub-task batch), not one mega-commit.

---

## File structure (modified by this plan)

### Modify
- `src/app/page.tsx` — landing: remove "invite only", revise marriage language
- `src/app/discover/page.tsx` — action button order, pause-button location
- `src/components/app/swipe-card.tsx` (or `discover-card-face.tsx`) — pause button placement + progression bar animation
- `src/components/app/swipe-deck.tsx` — coordinate progression animation
- `src/app/profile/tokens/page.tsx` — icon corrections, duplicate brand mark removal
- `src/app/profile/page.tsx` — missing field display
- `src/app/settings/privacy/page.tsx` — fix "Hide me from strangers" toggle
- `src/app/settings/safety/page.tsx` — back-button destination
- `src/components/app/legal-article-shell.tsx` — back-to-app destination
- `src/app/billing-portal/page.tsx` — full rewrite (Phase G)
- `src/components/app/chat-thread-view.tsx` + `chat-bubble.tsx` — reaction handler + display (Phase F)
- `src/app/onboarding/assembly/page.tsx` (or equivalent identification step) — taxonomy update
- `src/lib/use-profile.ts` — add new fields to profile type if Phase E proceeds
- Multiple files for em-dash + identification copy sweep (audit in Task A2)

### Create
- `src/lib/icon-map.ts` — single source-of-truth icon constants (Task B1)
- `ahavah-api/migrations/0015_message_reactions.sql` — Phase F backend
- `ahavah-api/service/api/__init__.py` — Phase F endpoint registration

### Do NOT touch
- Any kit primitive (`components/ui/*`) unless explicitly required by a task
- The four behind-auth-fixed routes (committed in 25fc5d2)
- The four public marketing routes (committed in 515c0fb)

---

## PHASE A — Copy, content, identity language

### Task A0: Audit + remove every em-dash in user-facing strings

**Files:**
- Audit: all `.tsx` files under `src/app/` and `src/components/`
- Modify: each file with a hit

- [ ] **Step 1: Grep for em-dash character across user-facing source**

```bash
cd "d:/Antigravity/ahavah-web" && grep -rn "—" src/app src/components --include="*.tsx" --include="*.ts" | grep -v "^Binary" > /tmp/emdash-audit.txt && wc -l /tmp/emdash-audit.txt
```

Expected: file list with line numbers and matching content. Save the count.

- [ ] **Step 2: Triage hits**

For each hit, classify:
- **USER-FACING** (string literal in JSX text, placeholder, aria-label, alt, button text, etc.) → must replace
- **CODE COMMENT** (`// — note —` etc.) → leave alone

- [ ] **Step 3: Replace USER-FACING em-dashes with " - " (regular hyphen with spaces) or rephrase**

Per occurrence, judgement call:
- For visual separation in titles: replace with comma + space
- For parenthetical asides in body copy: rewrite as a comma clause or split into two sentences
- For URL slugs / file names: no em-dash should exist; if found, replace with hyphen

- [ ] **Step 4: Verify zero user-facing em-dashes remain**

```bash
cd "d:/Antigravity/ahavah-web" && grep -rn "—" src/app src/components --include="*.tsx" | grep -vE "^[^:]+:\s*//|/\*|\*" | head -20
```

Expected: empty output (or only code comments).

- [ ] **Step 5: Commit**

```bash
git add -A src/
git commit -m "fix(copy): remove em-dashes from all user-facing strings

Per project rule [[feedback_no_em_dashes]] - en/em dashes in display
copy are non-canonical. Replaced with comma clauses, hyphens with
surrounding spaces, or split sentences depending on context. Code
comments retained.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A1: Remove "Invite only" from landing

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Grep for "invite only" in landing**

```bash
grep -in "invite only\|invite-only\|InviteOnly" "d:/Antigravity/ahavah-web/src/app/page.tsx"
```

Expected: one or more matches. Note the exact strings.

- [ ] **Step 2: Remove or rephrase each occurrence**

Likely surface: hero eyebrow "Spring 2026 · Invite only". Change to "Spring 2026".

Apply via Edit tool:
```tsx
// Find:
<span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--ink-2)">
  Spring 2026 · Invite only
</span>
// Replace with:
<span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--ink-2)">
  Spring 2026
</span>
```

- [ ] **Step 3: Verify no remaining occurrences in landing**

```bash
grep -in "invite" "d:/Antigravity/ahavah-web/src/app/page.tsx"
```

Expected: empty (or only non-marketing references).

- [ ] **Step 4: Typecheck**

```bash
cd "d:/Antigravity/ahavah-web" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix(landing): remove 'Invite only' from hero eyebrow

The product launches Spring 2026 in waves, not invite-gated. The
eyebrow is now just the launch quarter."
```

---

### Task A2: Establish canonical identification taxonomy

**Files:**
- Create: `src/lib/identification.ts` — canonical taxonomy
- Modify: any place that consumes identification terms (onboarding, profile, filters)

**Decisions to capture in code:**

The PDF lists 8 self-identification terms. They represent a SPECTRUM, not categories — a single user can identify as multiple. So the field should be **multi-select**.

- [ ] **Step 1: Create canonical list**

```tsx
// src/lib/identification.ts
/**
 * Self-identification terms for Messianic Torah-observant believers.
 * Per user 2026-05-19 PDF, this is the spectrum users self-identify
 * with. Multi-select on the profile (a user can be both "Messianic" and
 * "Pronomian" for example). NOT mutually exclusive.
 *
 * The list is the canonical source; do not duplicate inline.
 */
export const IDENTIFICATION_TERMS = [
  { value: "israelite",         label: "Israelite" },
  { value: "hebrew-israelite",  label: "Hebrew Israelite" },
  { value: "messianic",         label: "Messianic" },
  { value: "pronomian",         label: "Pronomian" },
  { value: "hebrew-roots",      label: "Hebrew Roots" },
  { value: "follower-of-the-way", label: "Follower of The Way" },
  { value: "natsarim",          label: "Natsarim" },
  { value: "jew",               label: "Jew" },
] as const;

export type IdentificationValue =
  (typeof IDENTIFICATION_TERMS)[number]["value"];
```

- [ ] **Step 2: Find existing identification step in onboarding**

```bash
grep -rln "assembly\|torah level\|tradition\|identification\|self-identif" \
  "d:/Antigravity/ahavah-web/src/app/onboarding/" | head -10
```

Expected: one of `/onboarding/assembly/`, `/onboarding/looking-for/`, or similar.

- [ ] **Step 3: Read that file + understand the existing question pattern**

```bash
head -100 "d:/Antigravity/ahavah-web/src/app/onboarding/assembly/page.tsx"
```

Note current data model: option array + state shape + how `useProfile().update()` is called.

- [ ] **Step 4: Replace the option array with `IDENTIFICATION_TERMS`**

Map current options → new taxonomy. If the existing field is `assembly` (single-select), this becomes a multi-select. Apply via Edit tool:

```tsx
import { IDENTIFICATION_TERMS } from "@/lib/identification";
// Replace the inline OPTIONS / OBSERVANCE arrays with IDENTIFICATION_TERMS.
// If existing field is single-select, convert to a Set<string> in local state.
```

- [ ] **Step 5: Update profile display (`src/app/profile/page.tsx`) to render multi-value identification**

Find the existing assembly/identification render block. Render selected items as a row of `<Pill variant="lavender" size="sm">` (kit primitive).

- [ ] **Step 6: Typecheck + smoke**

```bash
npx tsc --noEmit && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/onboarding/assembly
```

Expected: no errors, 200.

- [ ] **Step 7: Commit**

```bash
git add src/lib/identification.ts src/app/onboarding/ src/app/profile/page.tsx
git commit -m "feat(identity): canonical Messianic Torah-observant taxonomy

Add 8-term self-identification taxonomy per 2026-05-19 PDF: Israelite,
Hebrew Israelite, Messianic, Pronomian, Hebrew Roots, Follower of The
Way, Natsarim, Jew. Multi-select (a user can identify as several).
Replaces the previous single-value 'assembly' field on the
onboarding/identification step and the profile display."
```

---

### Task A3: Revise goal-framing copy — marriage / spouses / betrothal

**Files:**
- Modify: `src/app/page.tsx` (landing), `src/app/faq/page.tsx`, `src/app/onboarding/looking-for/page.tsx`, `src/app/onboarding/marital-status/page.tsx`, anywhere else with goal language

- [ ] **Step 1: Grep for goal-language**

```bash
grep -rn "find love\|find someone\|dating\|date someone\|partner\|relationship" \
  "d:/Antigravity/ahavah-web/src/app/" --include="*.tsx" | head -30
```

Note each occurrence.

- [ ] **Step 2: Rephrase each user-facing instance per these rules**

| Source phrase | Replace with |
|---|---|
| Find love | Find a spouse |
| Find love across borders | Find your spouse across borders |
| The dating app | The matchmaking platform / The platform |
| Find someone (vague) | Find a spouse |
| Partner | Spouse (when context = marriage) |
| Relationship | Marriage / betrothal (per context) |
| Connect with someone | Connect with a future spouse |

For pre-launch landing hero, swap:

```tsx
// page.tsx hero
// Find:
<h1>Find love<br/>across borders.</h1>
<p>Verified profiles, 100+ languages, real connections. The dating app built for Torah-observant singles who don't fit anywhere else.</p>
// Replace with:
<h1>Find a spouse<br/>across borders.</h1>
<p>Verified profiles, 100+ languages, real connections. The matchmaking platform for Messianic Torah-observant believers, here to help you meet a future spouse.</p>
```

Repeat for FAQ "Who is Ahavah for?" answer, onboarding intros, etc.

- [ ] **Step 3: Verify no "Find love" or "dating app" copy remains**

```bash
grep -in "find love\|dating app" "d:/Antigravity/ahavah-web/src/app/" -r
```

Expected: empty (allow non-marketing references in code).

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "fix(copy): centre marriage / betrothal language

Per user direction 2026-05-19, the platform is about meeting a future
spouse, not 'dating' or 'finding someone'. Replaced goal-vague copy on
landing, FAQ, and onboarding with explicit marriage/spouse framing.
'Dating app' -> 'matchmaking platform'. 'Find love' -> 'Find a
spouse'. Recognises polygyny as a valid path (not 'singles only')."
```

---

### Task A4: Remove kashrut + Rabbinic Jewish jargon

**Files:**
- Modify: any file with "kashrut", "kosher", "shabbat", "shomer", or other Rabbinic-specific terms

**Note:** "Shabbat" is observed by both Rabbinic Jews and Messianic Torah-observants and is a SCRIPTURAL term, NOT exclusively Rabbinic. Keep. The terms to remove are doctrine-specific ones: kashrut (Rabbinic ruling on food), kosher (same), shomer (Sabbath-keeper, Rabbinic framing), etc.

- [ ] **Step 1: Grep**

```bash
grep -rin "kashrut\|kosher\|shomer\|halakha\|halakhic\|orthodox" \
  "d:/Antigravity/ahavah-web/src/" --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Replace per term**

| Term | Replacement |
|---|---|
| Kashrut / kosher | Dietary observance (or remove if optional filter) |
| Shomer Shabbat | Sabbath-keeping (or just "Shabbat") |
| Halakhic | Observance-based |
| Orthodox (used to mean Rabbinic) | Torah-observant |
| Frum | Observant |

- [ ] **Step 3: Verify**

```bash
grep -rin "kashrut\|kosher\|shomer\|halakha\|halakhic" "d:/Antigravity/ahavah-web/src/"
```

Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "fix(copy): remove Rabbinic Jewish jargon

Per 2026-05-19 direction, terms like 'kashrut', 'kosher', 'shomer',
'halakhic' are doctrine-specific to Rabbinic Judaism and not
universally adopted by Messianic Torah-observant believers. Replaced
with neutral scriptural language."
```

---

### Task A5: Position the audience explicitly as "Messianic Torah-observant believers"

**Files:**
- Modify: `src/app/page.tsx`, `src/app/faq/page.tsx`, `src/app/community/page.tsx`, FAQ pages

**Constraint per user:** "I'd like to avoid pushing religious doctrine while making it clear it's a place for Messianics."

Walk a line: state the audience clearly without preaching. Reference the audience in copy lead-ins, FAQs, and the "Who is this for?" section. Do NOT add doctrine statements (no "we believe…", no "you must accept…").

- [ ] **Step 1: Update landing hero sub-copy**

```tsx
// page.tsx
// Find current:
<p>Verified profiles, 100+ languages, real connections. The matchmaking platform for Messianic Torah-observant believers, here to help you meet a future spouse.</p>
// Should already be applied in Task A3.
```

- [ ] **Step 2: Update FAQ "Who is Ahavah for?"**

```tsx
// src/app/faq/page.tsx
// In FAQS array, replace the first entry:
{
  q: "Who is Ahavah for?",
  a: "Messianic Torah-observant believers seeking a spouse. Members across the diaspora can meet across borders with verified identity and shared-belief filters.",
},
```

- [ ] **Step 3: Update community page lead**

```tsx
// src/app/community/page.tsx
// Modify the "spirit" section to start with:
{
  slug: "spirit",
  heading: "The spirit of it",
  body: "Ahavah exists so Messianic Torah-observant believers seeking marriage can meet without the noise of mainstream apps. Behave like someone you'd want to marry.",
},
```

- [ ] **Step 4: Verify no doctrine-pushing copy was added**

Read the diff. Check each new copy line:
- Does it state the audience without commanding belief? ✓ allowed
- Does it say "you must / we believe / true believers"? ✗ reject

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/faq/page.tsx src/app/community/page.tsx
git commit -m "fix(copy): position audience as Messianic Torah-observant

Per 2026-05-19 PDF, the audience is Messianic Torah-observant
believers - a key term because not all Torah-keepers believe in
Yeshua as Messiah. Copy now states the audience clearly without
pushing doctrine: no commands, no creedal statements, just a
positioning sentence in landing / FAQ / community lead."
```

---

### Task A6: Recognise polygyny (one man, multiple wives) in framing

**Files:**
- Modify: any place that frames the audience as "singles" exclusively

- [ ] **Step 1: Grep for "singles" framing**

```bash
grep -rin "singles\|single user\|never married" \
  "d:/Antigravity/ahavah-web/src/" --include="*.tsx" | head -20
```

- [ ] **Step 2: Where context = audience description, replace with neutral framing**

```tsx
// Examples:
"singles" -> "believers seeking a spouse"
"single Torah-observant" -> "Torah-observant believers seeking marriage"
"if you're single" -> "wherever you are in your matrimonial journey"
```

The existing `/onboarding/polygyny` and `/onboarding/marital-status` steps already accommodate polygyny. The framing fix is the COPY around it.

- [ ] **Step 3: Verify**

```bash
grep -rin "singles only\|just for singles" "d:/Antigravity/ahavah-web/src/"
```

Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "fix(copy): recognise polygyny in audience framing

The app supports polygyny (one man, multiple wives) per current
onboarding step. Copy elsewhere assumed 'singles only' - corrected
to neutral 'believers seeking a spouse' framing throughout."
```

---

### Task A7: Phase A commit checkpoint + browser smoke

- [ ] **Step 1: Run full typecheck**

```bash
cd "d:/Antigravity/ahavah-web" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run full build**

```bash
pnpm build
```

Expected: success, all routes prerender as before.

- [ ] **Step 3: Browser-smoke ALL touched routes**

Open in browser:
- `/` (landing) — verify hero copy + sub copy + eyebrow updated
- `/faq` — verify "Who is Ahavah for?" updated
- `/community` — verify "spirit" section updated
- `/onboarding/assembly` (or identification step) — verify multi-select with 8 terms
- `/profile` — verify multi-value identification renders as pills

- [ ] **Step 4: Surface for user review BEFORE proceeding to Phase B**

Phase A copy is the FOUNDATION of the rest. Get user sign-off on copy direction before changing icons / Discover / etc.

---

## PHASE B — Icon consistency

### Task B0: Investigate current icon usage

**Files (read-only):**
- `src/app/discover/page.tsx`
- `src/app/profile/tokens/page.tsx`
- `src/app/match/page.tsx`
- `src/components/app/boost-card.tsx`

- [ ] **Step 1: Inventory every icon used for boost / super-like / rewind / match**

```bash
grep -rn "Heart\|Sparkles\|Rewind\|Undo2\|Zap\|Star\|Crown" \
  "d:/Antigravity/ahavah-web/src/app/discover" \
  "d:/Antigravity/ahavah-web/src/app/profile" \
  "d:/Antigravity/ahavah-web/src/app/match" \
  "d:/Antigravity/ahavah-web/src/components/app/boost-card.tsx" \
  --include="*.tsx" | grep -v "import\|className"
```

- [ ] **Step 2: Build a matrix**

| Action | Discover icon | Tokens icon | Match icon | Boost-card icon |
|---|---|---|---|---|
| Boost | (record) | (record) | (record) | (record) |
| Super-like | (record) | (record) | (record) | n/a |
| Rewind | (record) | (record) | n/a | n/a |
| Like | (record) | (record) | (record) | n/a |
| Match (celebration) | n/a | n/a | (record) | n/a |

- [ ] **Step 3: Resolve conflicts per user direction**

Per PDF:
- Super-like icon on /tokens differs from Discover → make them match
- "Use the same rewind icon as the back button" → rewind action uses same icon as the rewind/back button on Discover
- Boost ≠ super-like ≠ match — each needs a distinct icon

Canonical icon assignment (kit lucide-react):
| Action | Icon |
|---|---|
| Boost (30-min spotlight) | `Zap` (or `Rocket`) — energetic, distinct |
| Super-like (priority queue) | `Star` (filled on hover/active) — special prominence |
| Rewind (undo last pass) | `RotateCcw` (curved arrow) — universal "undo" |
| Like (mutual interest) | `Heart` (filled) |
| Match (celebration) | No icon (the lime pill IS the celebration per current /match) |

Document this in `src/lib/icon-map.ts`.

---

### Task B1: Canonical icon map

**Files:**
- Create: `src/lib/icon-map.ts`

- [ ] **Step 1: Create the map**

```tsx
// src/lib/icon-map.ts
/**
 * Canonical icon assignments for token actions across the app.
 * Imported from lucide-react. Use these exports — NEVER import the
 * underlying lucide icons directly at consumer sites for these
 * actions, so a future icon change happens in one place.
 *
 * Decisions (per 2026-05-19 PDF):
 * - Boost      = Zap        (energetic distinct shape)
 * - SuperLike  = Star       (priority/prominence)
 * - Rewind     = RotateCcw  (universal undo curved arrow)
 * - Like       = Heart      (mutual interest)
 * - Match celebration uses NO icon - the lime pill is the celebration.
 */
import {
  Heart,
  RotateCcw,
  Star,
  Zap,
} from "lucide-react";

export const TokenActionIcon = {
  Boost: Zap,
  SuperLike: Star,
  Rewind: RotateCcw,
  Like: Heart,
} as const;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/icon-map.ts
git commit -m "feat(icons): canonical icon map for boost/super-like/rewind/like

Single source-of-truth for action icons. Resolves the inconsistency
flagged in the 2026-05-19 PDF (super-like = Heart on /tokens but a
sparkle elsewhere; boost used same icon as super-like + match)."
```

---

### Task B2: Apply icon map to /discover, /profile/tokens, BoostCard, /match

**Files:**
- Modify: `src/app/discover/page.tsx`, `src/app/profile/tokens/page.tsx`, `src/components/app/boost-card.tsx`, `src/app/match/page.tsx`

- [ ] **Step 1: Replace each call site to use `TokenActionIcon`**

For each file, find the existing `<Heart>`, `<Sparkles>`, `<Zap>`, etc. icon usage and replace with the canonical:

```tsx
// Before:
import { Heart, Sparkles } from "lucide-react";
// ...
<Heart />     // for "super-like"
<Sparkles />  // for "boost"

// After:
import { TokenActionIcon } from "@/lib/icon-map";
// ...
const SuperLike = TokenActionIcon.SuperLike;
const Boost = TokenActionIcon.Boost;
<SuperLike />
<Boost />
```

- [ ] **Step 2: Audit each touched file for stale unused imports**

After the swap, remove now-unused lucide imports.

- [ ] **Step 3: Browser-smoke each surface**

- `/discover` — verify action row icons (Back, Pass, Like, Super-like) all distinct
- `/profile/tokens` — Boost / Super-like / Rewind cards each have correct icon
- `/match` — confirm no Sparkle (removed in earlier commit 04a5c27)
- BoostCard wherever it renders — Boost icon = Zap

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "fix(icons): apply canonical TokenActionIcon map across surfaces

Replaces inline lucide-react icon imports at /discover action row,
/profile/tokens cards, BoostCard, and /match (already cleared in
04a5c27). One icon per action, consistent across the app."
```

---

## PHASE C — /discover layout polish

### Task C0: Investigate current /discover action row + pause button

**Files (read-only):**
- `src/app/discover/page.tsx`
- `src/components/app/discover-card-face.tsx` (or wherever the photo card lives)

- [ ] **Step 1: Find the action-row implementation**

```bash
grep -n "Pass\|Like\|Super\|Boost\|Rewind\|action.row\|pause" \
  "d:/Antigravity/ahavah-web/src/app/discover/page.tsx" | head -20
```

- [ ] **Step 2: Find the pause button location**

```bash
grep -rn "Pause\|paused" "d:/Antigravity/ahavah-web/src/components/app/discover-card-face.tsx" "d:/Antigravity/ahavah-web/src/components/app/swipe-card.tsx" 2>&1 | head
```

Document current order + button location.

---

### Task C1: Reorder action buttons (Back, Pass/Next, Like, Super Like)

**Files:**
- Modify: `src/app/discover/page.tsx`

Canonical button order per PDF: **Back, Pass/Next, Like, Super Like.** (Read left-to-right.)

- [ ] **Step 1: Locate the JSX block containing the action buttons**

```bash
grep -n "Pass\|Like\|Super\|Boost\|Rewind" \
  "d:/Antigravity/ahavah-web/src/app/discover/page.tsx" | head -10
```

Note line numbers.

- [ ] **Step 2: Reorder buttons in source**

Reorder JSX so the buttons render Back → Pass → Like → SuperLike from left to right in flex-row order.

- [ ] **Step 3: Verify visual order at mobile + desktop**

Open `/discover` at 375px (mobile) and 1280px (desktop). Verify Back is leftmost, Super Like is rightmost.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/discover/page.tsx
git commit -m "fix(discover): reorder action buttons - Back, Pass, Like, Super Like

Per 2026-05-19 PDF. Reading order matches the user's mental model:
Back (undo) -> Pass (skip) -> Like (mutual interest) -> Super Like
(priority)."
```

---

### Task C2: Move pause/play button to the user profile card

**Files:**
- Modify: `src/app/discover/page.tsx` (remove from current location), `src/components/app/discover-card-face.tsx` (or relevant card component — add the pause button on the card itself)

- [ ] **Step 1: Find current pause button location**

Per Task C0 investigation, the pause button currently lives in the action row OR top bar.

- [ ] **Step 2: Remove pause button from current location**

Edit the source to delete the Pause/Play button JSX from the action row.

- [ ] **Step 3: Add pause button to the profile card**

Locate the photo card component (`discover-card-face.tsx` or similar). Add a Pause button in the top-right corner of the card (absolute-positioned), using kit `<Button size="icon-tap" variant="ghost">` with proper aria-label.

```tsx
// Inside the card component's JSX:
<Button
  nativeButton={false}
  size="icon-tap"
  variant="ghost"
  aria-label={paused ? "Resume images" : "Pause images"}
  className="absolute top-3 right-3 z-20 text-white drop-shadow-md"
  onClick={togglePause}
>
  {paused ? <Play /> : <Pause />}
</Button>
```

- [ ] **Step 4: Wire pause state**

The pause state controls the progression-bar animation (Task C3). Existing state likely lives in `swipe-deck.tsx` or `use-discover-deck.ts`. Pass `paused` + `togglePause` as props from parent.

- [ ] **Step 5: Browser verify**

`/discover` — pause button is on the card, top-right corner. Tap toggles state. Confirm no pause button in action row.

- [ ] **Step 6: Typecheck + commit**

```bash
git add -A
git commit -m "fix(discover): move pause button from action row to profile card

Per 2026-05-19 PDF. The pause control belongs visually adjacent to
the content it pauses (the image progression on the card), not the
match-action row."
```

---

### Task C3: Animate progression bars for multi-image users

**Files:**
- Modify: `src/components/app/photo-caption.tsx` (or wherever the progression bars are rendered atop the photo card)
- Reference: the bars CURRENTLY render but don't animate

- [ ] **Step 1: Locate the progression bars in the card component**

```bash
grep -rn "phone__timeline\|progress.bar\|story.bar\|timeline" \
  "d:/Antigravity/ahavah-web/src/components/app/" --include="*.tsx" | head -10
```

The user's match page has `phone__timeline` patterns (3 horizontal bars in the design); the /discover card likely uses a similar structure (a `<div>` with N child `<span>` bars).

- [ ] **Step 2: Invoke /frontend-design before designing the animation**

The animation is a NEW UI behaviour. Per the rules above, invoke `frontend-design:frontend-design` to confirm aesthetic + invoke `mobile-responsive` for mobile-perf considerations (transforms only, 60fps).

- [ ] **Step 3: Design the animation**

Canonical pattern (per Instagram/Tinder stories):
- Each bar represents one image in the user's photo set
- The CURRENT bar's lime fill progresses from 0 → 100% over the image-display duration (e.g., 4 seconds)
- Past bars are 100% filled; future bars are at 0%
- Pausing freezes the fill at its current point

Implementation approach:
- Each bar is a `<div>` with `bg-white/20` and a child `<div>` with `bg-lime` whose `transform: scaleX(progress)` is controlled via CSS animation or `motion/react`.
- Use `motion`'s `motion.div` with `animate={{ scaleX: 1 }}` and a `transition={{ duration: 4, ease: "linear" }}` key'd to current image index so animation restarts on image change.
- Pause via `animationPlayState: "paused"` (CSS) or motion's controls.

- [ ] **Step 4: Implement**

In the card-face component:

```tsx
// Pseudo-code; replace with actual file + variable names
{photos.map((_, i) => (
  <div key={i} className="flex-1 h-[3px] rounded-[2px] bg-white/20 overflow-hidden">
    {i === currentIndex && (
      <motion.div
        key={`progress-${currentIndex}-${paused ? "paused" : "running"}`}
        className="h-full w-full origin-left bg-(--color-lime) shadow-[0_0_6px_rgba(215,255,129,0.5)]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: paused ? undefined : 1 }}
        transition={{ duration: 4, ease: "linear" }}
        onAnimationComplete={() => advanceToNextImage()}
      />
    )}
    {i < currentIndex && (
      <div className="h-full w-full bg-(--color-lime)" />
    )}
  </div>
))}
```

Confirm `advanceToNextImage()` exists in the parent and is wired to the `currentIndex` state.

- [ ] **Step 5: Browser verify**

`/discover` with a user who has multiple images — bars fill smoothly over 4s each, advance to next image. Pause button freezes mid-fill, resumes from there.

- [ ] **Step 6: Typecheck + commit**

```bash
git add -A
git commit -m "feat(discover): animated progression bars for multi-image users

Per 2026-05-19 PDF. Each bar atop the photo card now scales-X from 0
to 1 over a 4s linear duration, restarts on next image. Pause button
freezes the fill via motion's animationPlayState."
```

---

## PHASE D — Small bug fixes

### Task D1: Fix /profile/tokens duplicate brand mark

**Files:**
- Modify: `src/app/profile/tokens/page.tsx`

- [ ] **Step 1: Identify the duplicate**

Read the file's banner section. Per the PDF screenshot, the indigo gradient banner has TWO Ahavah brand marks in the right corner (one large, one small).

```bash
grep -n "Logo\|LogoMark\|brand" "d:/Antigravity/ahavah-web/src/app/profile/tokens/page.tsx" | head -10
```

- [ ] **Step 2: Delete the duplicate**

Keep the canonical placement (likely the larger one); delete the second instance.

- [ ] **Step 3: Browser verify**

`/profile/tokens` — only one brand mark in banner's right corner.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/tokens/page.tsx
git commit -m "fix(profile/tokens): remove duplicate brand mark from banner"
```

---

### Task D2: Safety + Legal "Back to app" → /settings

**Files:**
- Modify: `src/components/app/legal-article-shell.tsx`, `src/app/settings/safety/page.tsx`

Per PDF: safety + legal pages' back-to-app button should go to /settings (not /discover).

- [ ] **Step 1: Update legal-article-shell**

Find the `signedIn ? "/discover" : "/auth/sign-in"` ternary in the brand-bar Button (from Task A8 of the prior plan). Change `/discover` to `/settings`.

```tsx
// Find:
render={<Link href={signedIn ? "/discover" : "/auth/sign-in"} prefetch={false} />}
// Replace:
render={<Link href={signedIn ? "/settings" : "/auth/sign-in"} prefetch={false} />}
```

Update button text too:

```tsx
{signedIn ? "Back to settings" : "Sign in"}
```

- [ ] **Step 2: Update safety page back button**

```bash
grep -n "BackButton" "d:/Antigravity/ahavah-web/src/app/settings/safety/page.tsx"
```

Confirm safety page has a back button → /settings (probably already correct via settings-shell). If not, fix.

- [ ] **Step 3: Browser verify**

Sign in → `/legal/terms` → click "Back to settings" → lands on `/settings`. Same for `/legal/privacy`, `/legal/community-guidelines`, `/settings/safety`.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/legal-article-shell.tsx
git commit -m "fix(behind-auth): legal pages back-to-app goes to /settings

Per 2026-05-19 PDF. Legal + safety pages are reached from settings;
back should land there, not /discover."
```

---

### Task D3: Fix /privacy "Hide me from strangers" toggle

**Files:**
- Modify: `src/app/settings/privacy/page.tsx` (and likely a `lib/use-privacy.ts` or similar)

- [ ] **Step 1: Find the toggle**

```bash
grep -in "hide.from.strangers\|hideFromStrangers\|hide_from_strangers" \
  "d:/Antigravity/ahavah-web/src/app/settings/privacy/page.tsx"
```

- [ ] **Step 2: Check the wiring**

The toggle's `checked` + `onCheckedChange` props must read/write the corresponding backend field. Trace:
- The kit `<Switch>` or `<Toggle>` component renders the toggle
- Its `onCheckedChange` calls some `update()` function
- The update flows through `useProfile` (or similar) to a backend API field

Likely failure modes:
- Switch's `onCheckedChange` not bound to state update
- State update not patched to backend
- Backend field name mismatch
- Optimistic update reads stale value

- [ ] **Step 3: Fix the broken link in the chain**

Apply the minimal fix to wire `checked` and `onCheckedChange` correctly:

```tsx
<Switch
  checked={profile?.hideFromStrangers ?? false}
  onCheckedChange={(next) => update({ hideFromStrangers: next })}
  aria-label="Hide me from strangers"
/>
```

- [ ] **Step 4: Browser verify**

`/settings/privacy` — toggle responds to clicks, persists across page reloads.

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/privacy/page.tsx
git commit -m "fix(settings/privacy): wire 'Hide me from strangers' toggle

Per 2026-05-19 PDF. Toggle was rendering but not persisting state.
checked + onCheckedChange now read/write through useProfile().update()
to the canonical backend field."
```

---

### Task D4: Avatar fallback surfaces

**Files:**
- Identify: surfaces where avatars currently render blank when no photo exists
- Modify: those surfaces to show a kit `Avatar` with `AvatarFallback` (e.g. first-letter initial)

- [ ] **Step 1: Audit avatar surfaces**

```bash
grep -rn "Avatar\|avatar.*photo\|src=.*photo" \
  "d:/Antigravity/ahavah-web/src/" --include="*.tsx" | grep -v "import\|interface\|type" | head -30
```

For each match, check: does the JSX fall back to anything when `photo` is null/undefined?

- [ ] **Step 2: Apply kit `Avatar` + `AvatarFallback` pattern**

```tsx
// Bad:
{user.photo && <img src={user.photo} className="..." />}

// Good:
<Avatar size="md">
  {user.photo ? (
    <AvatarImage src={user.photo} alt={user.name} />
  ) : (
    <AvatarFallback>{user.name?.[0] ?? "?"}</AvatarFallback>
  )}
</Avatar>
```

- [ ] **Step 3: Browser verify**

Find a user (or test profile) with no uploaded photo. Confirm initial-fallback renders everywhere instead of empty box.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(avatars): use kit Avatar + AvatarFallback for no-photo state

Per 2026-05-19 PDF. Several surfaces rendered empty when a user had
no profile photo. Each now uses kit AvatarFallback (first-letter
initial) so the layout doesn't leave a hole."
```

---

### Task D5: Phase D checkpoint

- [ ] **Step 1: Run typecheck + build**

```bash
npx tsc --noEmit && pnpm build
```

- [ ] **Step 2: Surface for user review**

Phase A-D should now be complete. Hand back to user for browser verification across:
- Landing (Phase A copy)
- /faq / /community (Phase A copy)
- /discover (Phases B icons + C button order + pause-on-card + progression animation)
- /profile/tokens (Phase B icons + D1 duplicate mark)
- /legal/* (Phase D2 back-to-settings)
- /settings/privacy (Phase D3 toggle)

Get sign-off before Phase E.

---

## PHASE E — Profile schema (missing fields)

### Task E0: Identify which fields are missing

**Files (read-only):**
- `src/lib/use-profile.ts` (current profile shape)
- `docs/handoff-desktop/screens/05-profile-detail.md` (canonical profile field list)
- `src/app/profile/page.tsx` (rendered fields)

- [ ] **Step 1: Compare canonical vs current**

```bash
cat "d:/Antigravity/ahavah-web/docs/handoff-desktop/screens/05-profile-detail.md" | head -60
grep -n "interface\|type" "d:/Antigravity/ahavah-web/src/lib/use-profile.ts" | head -20
```

Build a table: canonical field × currently-implemented? × notes.

- [ ] **Step 2: Surface the gap list to user**

User said "Add the missing fields to the user profile" but didn't enumerate. Report findings:

> "Canonical /profile fields per `05-profile-detail.md`: A, B, C, ..., Z. Currently implemented: A, B, C, ..., X. Missing: Y, Z. Approve scope before proceeding."

This task PAUSES execution and asks the user.

---

### Task E1 onward: Add missing fields (TBD based on E0)

> **Branch decision:** Each missing field requires:
> 1. Backend column / migration
> 2. Frontend onboarding step OR profile-edit field
> 3. Profile display
> 4. Discover filter (if applicable)
>
> If the gap list from E0 is large (>3 fields), this should become its own plan rather than continue this one. Bookmark this point and decide.

---

## PHASE F + G — split into separate plans (user direction 2026-05-19)

Two PDF items are deferred to their own planning cycles because each is a multi-day feature with its own architecture decisions:

- **F — Chat reactions** (heart on double-tap / long-press): plan stub at [docs/superpowers/plans/2026-05-19-chat-reactions.md](docs/superpowers/plans/2026-05-19-chat-reactions.md). Needs brainstorming on reaction set, gesture timing, real-time delivery before tasks can be written.
- **G — Billing portal rebuild**: plan stub at [docs/superpowers/plans/2026-05-19-billing-portal-rebuild.md](docs/superpowers/plans/2026-05-19-billing-portal-rebuild.md). Needs architecture decision (Stripe Customer Portal vs embedded vs native proxy) before tasks can be written.

Wave 1 (this plan) covers items A0-A6 (copy + identity), B0-B2 (icons), C0-C3 (Discover polish), D1-D4 (small bug fixes), and gates Phase E (profile fields) on user input.

---

## Self-review

**Spec coverage check (against PDF items):**

| PDF Item | Plan task(s) |
|---|---|
| /discover button order | C1 |
| /discover pause→profile card | C2 |
| /discover progression animation | C3 |
| /profile/tokens super-like icon inconsistent | B1+B2 |
| /profile/tokens rewind icon ≠ Discover back | B1+B2 |
| Boost icon = super-like = match (inconsistent) | B1+B2 |
| /profile/tokens duplicate brand mark | D1 |
| Safety + Legal back-to-app → settings | D2 |
| /privacy "Hide me from strangers" broken | D3 |
| /chat add heart reaction (double-tap / long-press) | Separate plan: 2026-05-19-chat-reactions.md |
| Centre marriage / spouses / betrothal language | A3 |
| Remove kashrut + Rabbinic jargon | A4 |
| Torah observance / observant / Torah keepers as primary | A3+A4 |
| Recognise polygyny | A6 |
| Messianic Torah-observant positioning | A5 |
| 8 self-identification terms | A2 |
| Missing profile fields | E (TBD per E0) |
| Remove "invite only" | A1 |
| Remove em-dashes | A0 |
| Avatar surfaces without avatar | D4 |
| /billing-portal auto-redirect / unwired affordances | Separate plan: 2026-05-19-billing-portal-rebuild.md |

All 20 items covered: 18 inline (Wave 1) + 2 split into dedicated stub plans for F and G per user direction.

**Placeholder scan:** No "TBD" / "implement later" except in Phase E where the user must decide scope (intentional gate).

**Type consistency:** `TokenActionIcon`, `IDENTIFICATION_TERMS`, `hideFromStrangers` field names referenced consistently across tasks.

---

## Execution choice

Plan saved to `docs/superpowers/plans/2026-05-19-changes-document-wave-1.md`.

Recommendations:
- **Phases A-D**: execute inline in this session (per prior user preference: subagents drift). Each phase ends with a hard browser-verification checkpoint before the next begins.
- **Phase E**: pauses for user input on scope after E0 audit.
- **Phases F + G**: see their own plan stubs. Need brainstorming + decisions before executable tasks can be written.

Awaiting user review before any execution begins.
