# Sub-plan 16 — Marker State Badges on /map (Bumpy parity)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add small state-indicator badges to /map avatar markers — match (lime + Sparkles), active chat (lavender + MessageCircle), liked (pink + Heart). Passed candidates desaturate (grayscale + 0.5 opacity) with no badge. Closes the most visible remaining gap vs Bumpy reference screenshots.

**Architecture:** Pure logic in `src/lib/map-avatar-state.ts` resolves marker state from `(candidate, decisions, viewer, activeChats)` inputs. `MapAvatar` consumes the resolved state and renders the appropriate badge inside its Leaflet `L.divIcon` HTML (top-right corner, mirroring the existing 18×18 flag bubble in the bottom-right). One-time pulse animation on match badges via CSS `@keyframes` in `globals.css`.

**Tech Stack:** Existing Next.js 16 + React 19 + Tailwind v4 + Leaflet + react-leaflet (from SP14). No new deps. Tests via vitest.

---

## Context

User shared Bumpy reference screenshots showing avatars on the map carry small colored badge bubbles indicating decision/conversation state (heart for liked, paper-plane for sent message, message bubble for chat, ring for engagement, etc.). The SP14 closeout deferred this as a follow-up. After SP15 closed the IA loop, the next-highest-impact Bumpy parity item is these badges.

Design rationale (frontend-design skill invocation 2026-05-12):

- **Aesthetic direction:** refined sticker — paired with the existing 18×18 flag bubble. Visual family is "two paired stickers on each marker."
- **Hierarchy:** only ONE badge per marker (highest-priority state wins). Lime is RESERVED for match — never used elsewhere on the map.
- **Visual recession for passed:** no badge, full marker desaturate (grayscale + opacity 0.5). Attention falls on bright/badged markers naturally.

---

## Scope decisions locked

- **States set:** `"match" | "active-chat" | "liked" | "passed" | "none"`. Five states, ordered by priority.
- **Match detection:** uses `simulateLikesBack(viewer, candidate)` from `decision-engine.ts` — already exists from SP10. Match iff viewer LIKED candidate AND `simulateLikesBack` returns true.
- **Active-chat detection:** in MVP, hardcoded list of subject IDs that have seeded threads in `/inbox`. T2 reads the existing inbox seed data (`SEED_CHATS` or similar — find via grep) and exposes a static `Set<string>` of active-chat subject IDs.
- **Liked-state:** viewer has recorded a `like` decision against the candidate AND it's not a match.
- **Passed-state:** viewer has recorded a `pass` decision.
- **Badge placement:** top-right corner of avatar, 18×18px, 2px white border, `0 1px 3px rgba(0,0,0,0.4)` shadow — mirrors the existing flag bubble bottom-right.
- **Badge icons:** Sparkles (match), MessageCircle (chat), Heart filled (liked). Inlined as SVG strings inside the Leaflet `divIcon` HTML (Leaflet doesn't accept React components inside divIcons).
- **Match badge animation:** one-time CSS `@keyframes` pulse on mount, 600ms, scale 1 → 1.15 → 1. Defined globally in `globals.css`. Respects `prefers-reduced-motion`.
- **Passed marker treatment:** parent container of the divIcon HTML gets `filter: grayscale(100%); opacity: 0.5;`.
- **No tap-target change:** the 44×44 marker tap area is unchanged. Badges are decorative HTML inside (`pointer-events: none`).
- **Decision-undo aware:** `popLast()` from SP12 causes a previously-passed candidate to re-appear without a state badge. Resolver re-runs naturally because `useDecisions().decisions` updates.

---

## File structure

| File | Role |
|---|---|
| `src/lib/map-avatar-state.ts` | CREATE. `resolveMarkerState(input): MarkerState` pure function. ~50 lines. |
| `tests/lib/map-avatar-state.test.ts` | CREATE. ~7 test cases covering all states + priority resolution. |
| `src/components/app/map-avatar.tsx` | MODIFY. Accept `state` prop (or compute via the resolver). Render badge HTML in top-right corner. Apply grayscale+opacity wrapper when state === "passed". ~30 lines added. |
| `src/app/map/page.tsx` | MODIFY. Build the `activeChatIds` Set + resolve each candidate's state + pass to MapAvatar. ~10 lines added. |
| `src/app/globals.css` | MODIFY. Add `@keyframes marker-pulse` + the class that applies it (respecting `prefers-reduced-motion`). ~10 lines added. |
| `src/lib/inbox-seed.ts` (new) OR existing inbox data exposed | EXTRACT or LOCATE. The seed chat data needs a stable export so /map's active-chat resolver can read it. If it's currently inline inside `/inbox/page.tsx`, lift to a shared module. |
| `tests/components/app/map-avatar.smoke.test.tsx` | OPTIONAL. Test that MapAvatar renders the badge HTML for each state. Skip if jsdom-Leaflet integration is fragile. |
| `PROJECT-STATUS.md` | MODIFY. Append §23 closeout with citable verifications per §18 rule. |

No new dependencies, no new design tokens (uses existing `--color-lime`, `--color-lavender`, `--color-pink` CSS vars).

---

## Existing primitives reused

- **`MapAvatar`** at `src/components/app/map-avatar.tsx` — existing Leaflet marker with `L.divIcon` HTML. Extending its inline HTML string.
- **`useDecisions`** from `src/lib/use-decisions` — provides current decisions array.
- **`simulateLikesBack`** from `src/lib/decision-engine` — match-detection function.
- **`useProfile`** from `src/lib/use-profile` — viewer profile for the match calculation.
- **Lucide icons** — `Sparkles`, `MessageCircle`, `Heart` (verify they're already imported elsewhere; if so, just grab the SVG paths via `lucide-static` or inline the SVG markup).
- **CSS vars** — `--color-lime`, `--color-lavender`, `--color-pink` (verify they're defined in globals.css).

No new dependencies.

---

## Hard rules

1. **Pure logic first.** `resolveMarkerState` ships with tests in T1 before MapAvatar consumes it.
2. **Inline SVG, NOT React components inside divIcon.** Leaflet's divIcon takes raw HTML strings — React doesn't render there. The 3 icon SVGs (Sparkles, MessageCircle, Heart) are inlined as strings with their paths copied from lucide-static or extracted manually.
3. **Badge dimensions match the flag bubble exactly:** 18×18, 2px white border, same box-shadow. Visual family consistency is the point.
4. **Lime is reserved for match only.** Never reuse lime for other states on the map. The lime → match association is load-bearing.
5. **Respect `prefers-reduced-motion`** — match pulse animation should not fire when reduced-motion is set.
6. **§18 sign-off rule.** Every "X is complete" claim in §23 closeout must cite a verification query.
7. **The 44px tap target is sacred.** Don't shrink the avatar marker to fit badges. Badges sit at the corners overlapping outward (top: -2px, right: -2px) so they don't reduce the inner gradient area.

---

## Tasks

### T1 — Pure: `resolveMarkerState` + tests

**Files:**
- Create: `src/lib/map-avatar-state.ts`
- Create: `tests/lib/map-avatar-state.test.ts`

**Steps:**

- [ ] Step 1: Sketch the types:
  ```ts
  export type MarkerState = "match" | "active-chat" | "liked" | "passed" | "none";

  export interface ResolveMarkerStateInput {
    candidate: { id: string; firstName?: string };
    viewer: Profile;
    decisions: ReadonlyArray<Decision>;
    activeChatIds: ReadonlySet<string>;
  }

  export function resolveMarkerState(input: ResolveMarkerStateInput): MarkerState;
  ```

- [ ] Step 2: Implement the resolver. Priority: match > active-chat > liked > passed > none.
  ```ts
  export function resolveMarkerState({ candidate, viewer, decisions, activeChatIds }: ResolveMarkerStateInput): MarkerState {
    const decision = decisions.find((d) => d.subjectId === candidate.id);
    if (decision?.action === "like") {
      // Build the candidate's full Profile shape (needed by simulateLikesBack).
      // The candidate input only has id + firstName; the caller passes a fuller
      // Profile-shaped object. Type the input accordingly OR have the caller
      // pre-compute matchedness and just pass a `matched: boolean`.
      // Simpler: caller pre-computes `matched: boolean` via simulateLikesBack
      // and passes it in. resolveMarkerState consumes the boolean.
      if (input.matched) return "match";
      return activeChatIds.has(candidate.id) ? "active-chat" : "liked";
    }
    if (decision?.action === "pass") return "passed";
    return activeChatIds.has(candidate.id) ? "active-chat" : "none";
  }
  ```

  Adjust the input shape so `matched: boolean` is the caller's responsibility (cleaner separation than threading a Profile + simulateLikesBack into the resolver):

  ```ts
  export interface ResolveMarkerStateInput {
    candidate: { id: string };
    decisions: ReadonlyArray<Decision>;
    matched: boolean;             // pre-computed by caller via simulateLikesBack
    activeChatIds: ReadonlySet<string>;
  }
  ```

- [ ] Step 3: Write 7 tests covering:
  1. No decision + not in active chats → "none"
  2. No decision + in active chats → "active-chat"
  3. Decision pass → "passed"
  4. Decision like + not matched + not in chats → "liked"
  5. Decision like + matched → "match"
  6. Decision like + matched + in chats → "match" (priority test — match beats active-chat)
  7. Decision like + not matched + in chats → "active-chat" (priority test — chat beats liked)

- [ ] Step 4: Verify gates — tsc / eslint / vitest 251 + 7 = 258 passing.

### T2 — Locate or extract inbox seed data

**Files:**
- Read: `src/app/inbox/page.tsx`
- Possibly create: `src/lib/inbox-seed.ts` if the data is inline

**Steps:**

- [ ] Step 1: Grep for `SEED_CHATS\|name:.*Daniel\|name:.*Adina` in `src/app/inbox/page.tsx` to find the seed array.
- [ ] Step 2: If the seed array is inline in `/inbox/page.tsx`, EXTRACT it to `src/lib/inbox-seed.ts` and import from both locations. Otherwise, just expose `ACTIVE_CHAT_IDS: ReadonlySet<string>` from wherever the seed lives.
- [ ] Step 3: Export `ACTIVE_CHAT_IDS` as a `new Set<string>(SEED_CHATS.map((c) => c.id))` — derived from the existing seed data so it stays in sync.
- [ ] Step 4: Update `/inbox/page.tsx` to import from the new shared location if extracted. Verify /inbox still renders identically.
- [ ] Step 5: Verify gates.

### T3 — Add CSS keyframes for the match pulse

**Files:**
- Modify: `src/app/globals.css`

**Steps:**

- [ ] Step 1: At the bottom of globals.css (or wherever animations live — grep for `@keyframes` to find), add:
  ```css
  @keyframes ahavah-marker-pulse {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.15); }
    100% { transform: scale(1); }
  }

  .ahavah-marker-badge--match {
    animation: ahavah-marker-pulse 600ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .ahavah-marker-badge--match {
      animation: none;
    }
  }
  ```
- [ ] Step 2: Verify gates. No tests for CSS — verified via T5 smoke walk.

### T4 — Enhance `MapAvatar` to render state badges

**Files:**
- Modify: `src/components/app/map-avatar.tsx`

**Steps:**

- [ ] Step 1: Add a `state: MarkerState` prop:
  ```ts
  export interface MapAvatarProps {
    candidate: Profile & { id?: string };
    state?: MarkerState;  // NEW, default "none"
  }
  ```

- [ ] Step 2: Inline the 3 icon SVGs as constants at the top of the file:
  ```ts
  const SVG_SPARKLES = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`;
  const SVG_MESSAGE_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const SVG_HEART = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
  ```
  Lucide paths can be copied from `node_modules/lucide-static/icons/<name>.svg` for accuracy — the implementer verifies the exact paths after install.

- [ ] Step 3: Build a `badgeHtml(state)` helper that returns the HTML string for the badge (or empty string for none/passed):
  ```ts
  function badgeHtml(state: MarkerState): string {
    if (state === "match") {
      return `<div class="ahavah-marker-badge--match" style="position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%; background: var(--color-lime, #c8ff88); border: 2px solid white; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: 0 1px 3px rgba(0,0,0,0.4); pointer-events: none;">${SVG_SPARKLES}</div>`;
    }
    if (state === "active-chat") {
      return `<div style="position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%; background: var(--color-lavender, #9f76ea); border: 2px solid white; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: 0 1px 3px rgba(0,0,0,0.4); pointer-events: none;">${SVG_MESSAGE_CIRCLE}</div>`;
    }
    if (state === "liked") {
      return `<div style="position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%; background: var(--color-pink, #ffc0cb); border: 2px solid white; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: 0 1px 3px rgba(0,0,0,0.4); pointer-events: none;">${SVG_HEART}</div>`;
    }
    return "";
  }
  ```

- [ ] Step 4: Build the full marker HTML — combine the existing gradient circle + flag bubble + new badge. When state === "passed", wrap the whole HTML in a parent div with `filter: grayscale(100%); opacity: 0.5;`:
  ```ts
  const dimWrapStart = state === "passed" ? `<div style="filter: grayscale(100%); opacity: 0.5;">` : "";
  const dimWrapEnd   = state === "passed" ? `</div>` : "";
  const html = `${dimWrapStart}<div style="position: relative; width: 44px; height: 44px;">
    <!-- existing gradient circle + flag bubble HTML stays here -->
    ${badgeHtml(state)}
  </div>${dimWrapEnd}`;
  ```
  Read the current map-avatar.tsx for exact existing HTML composition and merge cleanly. Do NOT change the existing gradient circle or flag bubble HTML — only add the new badge + the optional wrapper.

- [ ] Step 5: Update the aria-label to include state context:
  ```ts
  const stateLabel = state === "match" ? "Matched. " : state === "liked" ? "Liked. " : state === "active-chat" ? "Active chat. " : state === "passed" ? "Passed. " : "";
  const ariaLabel = `${stateLabel}${name}, ${age}, in ${countryLabel}`;
  ```

- [ ] Step 6: Verify gates — tsc / eslint / vitest. No new tests for the component itself (covered by smoke walk in T6).

### T5 — /map page integration

**Files:**
- Modify: `src/app/map/page.tsx`

**Steps:**

- [ ] Step 1: Add imports:
  ```ts
  import { useDecisions } from "@/lib/use-decisions";
  import { simulateLikesBack } from "@/lib/decision-engine";
  import { resolveMarkerState } from "@/lib/map-avatar-state";
  import { ACTIVE_CHAT_IDS } from "@/lib/inbox-seed"; // or wherever T2 landed it
  ```

- [ ] Step 2: Inside the component:
  ```ts
  const { decisions } = useDecisions();
  ```

- [ ] Step 3: When mapping `visibleSamples` to `<MapAvatar>` elements, pre-compute state per candidate:
  ```tsx
  {visibleSamples.map((p) => {
    const id = p.firstName?.toLowerCase() ?? "";
    const matched = !!viewer && simulateLikesBack(viewer, p);
    const state = resolveMarkerState({
      candidate: { id },
      decisions,
      matched,
      activeChatIds: ACTIVE_CHAT_IDS,
    });
    return <MapAvatar key={id} candidate={p} state={state} />;
  })}
  ```

- [ ] Step 4: Verify gates.

### T6 — Smoke walk + §23 closeout + merge

**Files:**
- Modify: `PROJECT-STATUS.md`

**Steps:**

- [ ] Step 1: Browser smoke walk at 414×896. Seed localStorage to exercise all 5 states:
  ```js
  // Eligible viewer (Daniel: BB / male / first-wife / torah-observant / supports polygyny)
  localStorage.setItem("ahavah.profile.v1", JSON.stringify({
    firstName: "TestViewer",
    age: 32,
    sex: "male",
    country: "BB",
    intent: "first-wife",
    assembly: "torah-observant",
    polygyny: "supports",
    verificationTags: ["government-id"],
    relocation: "wants-partner-willing",
  }));
  // Decisions: Adina liked → match (depending on simulateLikesBack); Esther liked → liked-only; Caleb passed
  localStorage.setItem("ahavah.decisions.v1", JSON.stringify([
    { subjectId: "adina",  action: "like", timestamp: 1 },
    { subjectId: "esther", action: "like", timestamp: 2 },
    { subjectId: "caleb",  action: "pass", timestamp: 3 },
  ]));
  location.reload();
  ```

  Then verify on /map:
  1. Adina marker: lime badge (Sparkles icon) if `simulateLikesBack` returns true for this viewer/Adina pair. The pulse animation fires once on first render. Otherwise pink badge (liked).
  2. Esther marker: pink badge (Heart icon).
  3. Caleb marker: grayscale + opacity 0.5, no badge.
  4. Inbox-seeded candidates (Yosef, Rivka, Tirzah, Daniel — verify which are in the seed) get lavender MessageCircle badges UNLESS they have a higher-priority state.
  5. Untouched candidates: normal markers, no badge.

  Screenshots:
  - `docs/screenshots/sub-plan-16-states-all.png` — wide view showing multiple states
  - `docs/screenshots/sub-plan-16-match-badge-detail.png` — zoom on one match badge

- [ ] Step 2: Append PROJECT-STATUS §23. Each shipped state anchored to:
  - `grep -n "marker-pulse" src/app/globals.css` → returns the keyframes
  - `grep -n "resolveMarkerState" src/lib/map-avatar-state.ts src/app/map/page.tsx` → returns the resolver + the consumer
  - Test count: 251 + 7 = 258 (or actual)
  - Smoke walk results per state

- [ ] Step 3: Full verification gates — tsc / eslint / vitest 258 / build 46 routes.

- [ ] Step 4: Commit docs. Merge to master via `git merge --no-ff sub-plan-16-marker-state-badges`.

---

## Verification

Per-task:
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 251 + new tests = 258 passing
- Browser smoke walk for T4, T5, T6

Whole-sub-plan (after T6):
- Tests: ≥258 passing
- TypeCheck clean
- Lint clean
- Production build clean — 46 routes
- End-to-end smoke walk per T6 Step 1
- PROJECT-STATUS §23 anchored to verification queries per §18 rule
- `grep -rn "ahavah-marker-badge--match" src/app/globals.css src/components/app/map-avatar.tsx` → returns the keyframes class + the badge HTML applying it
- `grep -rn "resolveMarkerState\|MarkerState" src/lib/ src/components/ src/app/` → returns the resolver + consumer

---

## Self-review notes

- **Spec coverage:** every Bumpy reference badge has a corresponding state in the resolver. Match (lime), chat (lavender), liked (pink). Bumpy also shows paper-plane (sent) + ring (engaged) — both deferred (no data signal for those in our MVP).
- **Placeholder scan:** zero TBD. Every "implement X" step has the exact CSS / TS / type signatures.
- **Type consistency:** `MarkerState` union defined in T1, consumed in T4 + T5 unchanged.
- **DRY:** badge HTML construction is inside `badgeHtml(state)` helper — single source of truth for badge styling. SVG icons inlined as constants.
- **Scope fence:**
  - No backend.
  - No new design tokens (uses existing CSS vars).
  - No new motion variants beyond the single match-pulse keyframe.
  - No tap-target changes.
  - No new tests on the React component shell (component-test coverage via smoke walk).
- **Failure-pattern guard:**
  - frontend-design skill invoked BEFORE writing this spec (lesson from SP15 T4's placement miss). Specific pixel values, color tokens, and hierarchy baked into the spec.
  - SDD per task with two-stage review.
  - §23 closure cites verification queries.

---

## Execution

This plan is structured for `superpowers:subagent-driven-development`. 6 tasks; T1 (pure logic) first per TDD discipline. Each task fits a single implementer dispatch + spec review + code-quality review. The pure-logic task ships tests first; the UI tasks gate on browser smoke walks (Playwright MCP, viewport 414×896).

Estimated subagent invocations: ~18 (6 implementers + 6 spec reviewers + 6 code-quality reviewers, plus fix-ups as needed).

Branch: `sub-plan-16-marker-state-badges`. Merge to master via `git merge --no-ff`.

---

## Deferred (not in SP16)

- **Paper-plane "sent message" badge** — no per-message "did I send the last one" data signal in MVP.
- **Engagement-ring "in courtship" badge** — no engagement/courtship-state model in MVP.
- **Match celebration animation on /map** beyond the badge pulse — could add a "fireworks" effect on the marker the first time a match is computed, but adds complexity for low marginal value. Deferred.
- **Marker sizing by activity / recency** — needs an activity-timestamp signal we don't track.
- **Real photo avatars** — Tier-4 backend (photo upload pipeline).
- **Widened 12-axis audit (T5 from SP15)** — still deferred until all pages/screens/surfaces complete.
- **Legal pages** — awaiting your copy.
