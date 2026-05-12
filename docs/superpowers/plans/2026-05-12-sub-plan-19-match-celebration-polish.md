# Sub-plan 19 — `/match` celebration polish (paper-and-sticker aesthetic)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/match` the most emotionally rewarding screen in Ahavah. Lean further into the playful sticker-and-paper aesthetic already gestured at (paper-frame photos, tilted badge) by adding confetti burst, atmospheric depth, brand-color heartbeat, and a "two souls recognized" sparkle detail. No new dependencies; reuse `motion/react` + existing brand tokens.

**Architecture:** One new presentational primitive `<Confetti>` (paper-shape SVG burst keyed off brand-token colors) + targeted enhancements to `src/app/match/page.tsx` for halo pulse, gradient mesh background, badge heartbeat, polaroid corner-tape, mid-cards sparkle dot, lime drop-shadow, Vibration API on mount. All motion respects `prefers-reduced-motion`. GPU-only transforms + opacity.

**Tech Stack:** Existing Next.js 16 + React 19 + Tailwind v4 + motion/react + Lucide icons (already in repo). No new deps.

---

## Context

User feedback at SP18 close: "[/match] could use the frontend-design treatment now that we're invoking the skill properly." User also instructed to invoke multiple skills (not just one) before drafting. Done in the controller (`frontend-design`, `accessibility`, `mobile-responsive`, `ui-design-system`) — design direction encoded directly into this spec.

The current `/match` page (commit `8a0fba8`):
- Two paper-framed photo cards spring-stagger in from opposite sides with slight rotation (currently -12 → 0 left, +12 → +5 right)
- Static lime/20 blur halo behind them
- "It's a match!" lime Badge with `-rotate-3`, spring-pops in
- Subtitle text "You and {Name} liked each other"
- "Say hi 👋" composer + Send CTA to /chat/[id]
- "Keep swiping" secondary CTA back to /discover

What's missing: any sense of confetti / celebration burst, atmospheric depth, name-aware copy refinement, and the kind of micro-details (polaroid corner tape, kissing-paper sparkle, badge heartbeat) that elevate this from "competent celebration" to "moment you remember."

---

## Aesthetic direction (locked)

- **Tone:** refined-playful sticker-and-paper. Lean into existing tilted-badge + paper-frame photos. Add micro-detail layers that compound.
- **Color discipline:** lime is the brand-pop color of the moment. Lavender / pink / peach are supporting confetti pieces. NO new colors. NO hearts/fire (out of brand for Torah-observant audience).
- **Motion budget:** entrance cascade fits in ≤1.0s end-to-end. Confetti burst lifetime ≤1.4s. After settle, only one ambient animation (halo pulse) + zero infinite loops on focus-critical elements.
- **Reduced-motion behavior:** all spring/confetti/pulse/vibration disabled; static layout remains correct. Static badge + static photos + static halo (no pulse).

---

## Scope decisions locked

- **Confetti is a reusable primitive** (`src/components/app/confetti.tsx`) — extracted because future surfaces (e.g. premium unlock, first-message-sent, verification tier upgrade) likely want the same burst. Pure presentational; the pieces' positions/colors/rotations are pre-computed via a pure helper for testability.
- **Confetti piece count: 14** (4 lime + 4 lavender + 4 pink + 2 peach). Looks dense without thrashing the GPU on a low-end phone.
- **Confetti lifetime: 1.4s.** Each piece animates opacity [0 → 1 → 0] + translates from origin outward by a random radius (80–160px) in a random angle. After 1.4s the elements remain in DOM with `opacity: 0` and `pointer-events: none` — no remount needed.
- **Confetti fires once on /match mount**, after the badge spring (delay 0.3s — synchronized with the badge climax). It does NOT loop or re-fire on prop changes within the same mount.
- **Halo pulse: 3.5s infinite ease-in-out, opacity 0.2 → 0.4 → 0.2.** Continues until /match unmounts. Pure CSS keyframes; one definition in `globals.css`.
- **Gradient mesh background: two radial gradients applied via inline `style={{ backgroundImage: ... }}` on a fixed-positioned aria-hidden `<div>`.** Lime radial at top-center 25% (opacity 0.06), pink radial at bottom-center 75% (opacity 0.04). Pure CSS, zero JS, zero performance cost.
- **Badge heartbeat: single pulse after settle.** Motion-library animation: after the spring `whileInView` completes (delay 0.85s — after the spring duration), scale 1 → 1.05 → 1 over 600ms ease-out. Single iteration. Reduced-motion: skipped.
- **Polaroid corner tape: 24×8 rotated rectangle at top-right of each card.** Self card gets lavender tape (`bg-lavender/70`), matched card gets pink tape (`bg-pink/70`). Both `rotate-12deg`. Pure decoration, aria-hidden.
- **Mid-cards sparkle: small Sparkles icon (12×12) positioned at the overlap zone between the two cards.** Spring-pops in at delay 0.25s (right after both cards settle, before the badge enters). Lime color. aria-hidden.
- **Vibration API on mount: `navigator.vibrate([50, 30, 80])` triple-pulse pattern.** Skip if `!navigator.vibrate` (desktop / SSR). Skip if reduced-motion is set. Runs ONCE in a `useEffect` with empty deps. Wrapped in try/catch (some browsers throw if the page isn't focused).
- **Lime drop-shadow under badge:** `shadow-[0_4px_20px_rgba(200,255,136,0.4)]` to ground the badge in brand color. Tailwind arbitrary value; the rgba is `--color-lime` at 0.4 alpha hardcoded (Tailwind doesn't support `var()` inside `rgba()` without modern CSS color syntax — implementer can swap to `oklch` if cleaner, but the hardcoded hex matches the existing pattern in `verify-tier-shell.tsx`).
- **Copy: no changes.** "It's a match!" + "You and {Name} liked each other" + "Say hi 👋" + "Keep swiping" all stay. User didn't ask for copy refinements.
- **No filter / decision-state coupling.** This is a pure presentation polish — no new data flows.

---

## File structure

| File | Role |
|---|---|
| `src/components/app/confetti.tsx` | CREATE. `<Confetti pieces?={number} duration?={number} />` primitive. Renders N paper-shape pieces (mix of `<rect>` + `<circle>` SVG) at randomized brand-color + angle + distance. ~80 lines. |
| `src/lib/confetti-pieces.ts` | CREATE. Pure helper `generatePieces(count: number): ConfettiPiece[]`. Pre-computes piece config (color, shape, angle, distance, rotation). Deterministic via seeded PRNG so SSR + hydration agree on positions. ~50 lines. |
| `tests/lib/confetti-pieces.test.ts` | CREATE. ~4 vitest cases: count, color distribution, deterministic (same seed → same pieces), reasonable distance bounds. |
| `src/app/globals.css` | MODIFY. Add `@keyframes ahavah-halo-pulse` + `.ahavah-halo--pulse` class with prefers-reduced-motion override. ~12 lines. |
| `src/app/match/page.tsx` | MODIFY. Compose Confetti, halo pulse class, gradient mesh background, badge heartbeat motion, corner-tape divs, mid-cards sparkle, lime drop-shadow, Vibration API on mount. ~50 added lines. |
| `PROJECT-STATUS.md` | MODIFY. Append §26 closeout. |

No new dependencies. No new design tokens.

---

## Existing primitives reused

- `Badge` from `@/components/ui/badge` — existing lime/lg variant + className override slot. (Existing -rotate-3 stays.)
- `Card` + `PhotoTile` for photo frames (existing).
- `motion` from `motion/react` for confetti burst + badge heartbeat.
- `Sparkles` icon from lucide-react (already used elsewhere in the app).
- CSS vars `--color-lime`, `--color-lavender`, `--color-pink`, `--color-peach` from `globals.css`.

---

## Hard rules

1. **GPU-only transforms.** Confetti pieces animate via `transform` (translate + rotate + scale) + `opacity` only. Never `left/top/width/height`.
2. **prefers-reduced-motion respected.** Confetti hidden entirely under reduced-motion (visibility:hidden or {scale: 0}). Halo pulse paused via `@media (prefers-reduced-motion: reduce)`. Badge heartbeat skipped. Vibration skipped.
3. **No infinite loops on focus-critical elements.** Only the halo pulse runs forever (decorative background). Badge / confetti / sparkle all complete and stop.
4. **Pure helper for piece generation.** Deterministic via seeded PRNG so SSR + hydration don't disagree on confetti positions (avoids React hydration mismatch).
5. **Vibration is best-effort.** Wrapped in try/catch. Silent if unsupported. Skipped under reduced-motion.
6. **§18 sign-off rule.** §26 closeout cites verification queries.
7. **Tap targets unchanged.** All existing 44px tap surfaces (X close, Send, Keep swiping, photo cards as Link) stay. New decoration is aria-hidden + pointer-events: none.

---

## Tasks

### T1 — Pure: `confetti-pieces.ts` helper + tests

**Files:**
- Create: `src/lib/confetti-pieces.ts`
- Create: `tests/lib/confetti-pieces.test.ts`

**Steps:**

- [ ] Step 1: Implement seeded PRNG (mulberry32 — 5-line classic). Don't use Math.random — needs to be deterministic for SSR/hydration parity.

  ```ts
  function mulberry32(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  ```

- [ ] Step 2: Define the piece shape + the generator:

  ```ts
  export type ConfettiPiece = {
    color: "lime" | "lavender" | "pink" | "peach";
    shape: "rect" | "circle";
    /** Angle in radians, 0 = right, π/2 = down. */
    angle: number;
    /** Distance from origin in px after animation completes. */
    distance: number;
    /** Initial rotation in degrees. */
    rotation: number;
    /** Final rotation in degrees. */
    finalRotation: number;
    /** Animation delay relative to mount in seconds. */
    delay: number;
  };

  const PALETTE: ConfettiPiece["color"][] = [
    "lime", "lime", "lime", "lime",
    "lavender", "lavender", "lavender", "lavender",
    "pink", "pink", "pink", "pink",
    "peach", "peach",
  ];

  /**
   * Deterministic confetti piece generator. Same seed → same output.
   * Default `count=14` matches PALETTE length; passing different counts
   * cycles or truncates the palette.
   */
  export function generatePieces(count = 14, seed = 1): ConfettiPiece[] {
    const rng = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
      const angle = rng() * Math.PI * 2; // 0..2π
      const distance = 80 + rng() * 80;   // 80..160 px
      const rotation = (rng() - 0.5) * 60; // -30..30 deg
      const finalRotation = rotation + (rng() - 0.5) * 360; // tumble
      const delay = rng() * 0.15; // 0..0.15s — small stagger
      return {
        color: PALETTE[i % PALETTE.length],
        shape: i % 3 === 0 ? "circle" : "rect", // 1/3 circles, 2/3 rects
        angle,
        distance,
        rotation,
        finalRotation,
        delay,
      };
    });
  }
  ```

- [ ] Step 3: Tests (4 vitest cases):
  1. `generatePieces()` returns 14 pieces.
  2. Same seed → identical output (deterministic).
  3. Different seed → different output.
  4. Color distribution: 4 lime, 4 lavender, 4 pink, 2 peach.

- [ ] Step 4: Verify gates — tsc / eslint / vitest 270 + 4 = 274 passing.

### T2 — `<Confetti>` presentational primitive

**Files:**
- Create: `src/components/app/confetti.tsx`

**Steps:**

- [ ] Step 1: Implement the component:

  ```tsx
  "use client";

  import { motion, useReducedMotion } from "motion/react";

  import { generatePieces, type ConfettiPiece } from "@/lib/confetti-pieces";

  const COLOR_TO_CSS: Record<ConfettiPiece["color"], string> = {
    lime:     "var(--color-lime, #c8ff88)",
    lavender: "var(--color-lavender, #9f76ea)",
    pink:     "var(--color-pink, #ffc0cb)",
    peach:    "var(--color-peach, #ffb088)",
  };

  export interface ConfettiProps {
    /** Number of pieces. Default 14. */
    pieces?: number;
    /** Seed for deterministic position output. Default 1. */
    seed?: number;
    /** Animation duration in seconds per piece. Default 1.4. */
    duration?: number;
    /** Tailwind classes for absolute-positioning the burst origin. */
    className?: string;
  }

  /**
   * Paper-shape confetti burst. Fires once on mount, radiates 14 brand-
   * colored pieces from the burst origin, then idles at opacity 0
   * (pointer-events: none). Reduced-motion: pieces never appear.
   * Decorative; aria-hidden.
   */
  export function Confetti({
    pieces = 14,
    seed = 1,
    duration = 1.4,
    className,
  }: ConfettiProps) {
    const reduceMotion = useReducedMotion();
    const items = generatePieces(pieces, seed);

    if (reduceMotion) {
      return null;
    }

    return (
      <div
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-1/2 ${className ?? ""}`}
      >
        {items.map((p, i) => {
          const dx = Math.cos(p.angle) * p.distance;
          const dy = Math.sin(p.angle) * p.distance;
          const size = p.shape === "circle" ? 8 : 12;
          return (
            <motion.svg
              key={i}
              initial={{ x: 0, y: 0, rotate: p.rotation, opacity: 0, scale: 0.5 }}
              animate={{
                x: dx,
                y: dy,
                rotate: p.finalRotation,
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 1, 0.8],
              }}
              transition={{
                duration,
                delay: p.delay,
                ease: "easeOut",
                times: [0, 0.15, 0.7, 1],
              }}
              width={size}
              height={size}
              style={{ position: "absolute", color: COLOR_TO_CSS[p.color] }}
              viewBox="0 0 24 24"
            >
              {p.shape === "circle" ? (
                <circle cx="12" cy="12" r="10" fill="currentColor" />
              ) : (
                <rect x="2" y="2" width="20" height="20" rx="2" fill="currentColor" />
              )}
            </motion.svg>
          );
        })}
      </div>
    );
  }
  ```

- [ ] Step 2: Verify gates — tsc / eslint / vitest 274 (unchanged — no new tests for the React shell).

### T3 — `globals.css` halo pulse keyframes

**Files:**
- Modify: `src/app/globals.css`

**Steps:**

- [ ] Step 1: After the existing `@keyframes ahavah-marker-pulse` block (added in SP16 T3), append:

  ```css
  /* /match celebration halo — slow ambient pulse on the lime backdrop
     blur. Decorative; respects prefers-reduced-motion via the @media
     block. */
  @keyframes ahavah-halo-pulse {
    0%   { opacity: 0.2; }
    50%  { opacity: 0.4; }
    100% { opacity: 0.2; }
  }

  .ahavah-halo--pulse {
    animation: ahavah-halo-pulse 3.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .ahavah-halo--pulse {
      animation: none;
      opacity: 0.3;
    }
  }
  ```

- [ ] Step 2: Verify gates.

### T4 — `/match` page composition

**Files:**
- Modify: `src/app/match/page.tsx`

**Steps:**

Wrap the 7 enhancements as labeled edits. Read the existing file in full first; merge cleanly into the existing JSX structure.

- [ ] **Edit 1: Vibration on mount.**

  At the top of `MatchPageContent`, after the existing hooks:

  ```ts
  // Triple-pulse haptic on mount — PWA users on mobile get a real
  // physical "tap-tap-tap" for the match moment. Skipped if API absent
  // or prefers-reduced-motion is set. Silent on errors.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("vibrate" in navigator)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      navigator.vibrate([50, 30, 80]);
    } catch {
      /* ignore */
    }
  }, []);
  ```

  Add `import { useEffect } from "react";` (already imported, verify).

- [ ] **Edit 2: Gradient mesh background.**

  Inside the `PageShell` (right after the opening tag, before the existing `<h1 className="sr-only">`):

  ```tsx
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 -z-10"
    style={{
      backgroundImage: `
        radial-gradient(ellipse 60% 40% at 50% 15%, rgba(200, 255, 136, 0.06), transparent 70%),
        radial-gradient(ellipse 70% 50% at 50% 90%, rgba(255, 192, 203, 0.04), transparent 75%)
      `,
    }}
  />
  ```

- [ ] **Edit 3: Halo pulse class.**

  Find the existing `<span aria-hidden className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full bg-lime/20 blur-3xl" />`. Append the new class:

  ```tsx
  <span
    aria-hidden
    className="ahavah-halo--pulse pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full bg-lime/20 blur-3xl"
  />
  ```

- [ ] **Edit 4: Corner-tape detail on each photo card.**

  Inside each `<Card>` (after the `<PhotoTile>`):

  Self card (existing rotate-0 settle):
  ```tsx
  <span
    aria-hidden
    className="pointer-events-none absolute right-2 top-2 h-2 w-6 rotate-12 rounded-sm bg-lavender/70"
  />
  ```

  Matched card (existing rotate-5 settle):
  ```tsx
  <span
    aria-hidden
    className="pointer-events-none absolute right-2 top-2 h-2 w-6 rotate-12 rounded-sm bg-pink/70"
  />
  ```

  The `<Card>` already has `overflow-hidden`. Verify the tape paints inside the rounded corners — if it's clipped wrong, adjust to position absolutely OUTSIDE the photo (parent `<motion.div>` may need `relative` if it's not already).

- [ ] **Edit 5: Mid-cards sparkle dot.**

  Between the two card `<motion.div>`s, add a third sibling that's absolutely positioned at the visual overlap. Wrap the existing flex container in `relative` if needed:

  ```tsx
  {/* "Two souls recognized" sparkle — appears at the kissing-paper
      overlap between cards. Pop-springs in AFTER both cards settle,
      BEFORE the badge climax. */}
  <motion.div
    aria-hidden
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 280, damping: 14, delay: 0.25 }}
    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
  >
    <Sparkles className="size-3 text-lime drop-shadow-[0_0_8px_rgba(200,255,136,0.6)]" />
  </motion.div>
  ```

  Add `import { Sparkles } from "lucide-react";` (verify import already present).

  Place this INSIDE the `<div className="relative">` wrapper that holds the two card `<motion.div>`s. If that wrapper isn't `relative`, the absolute positioning won't anchor correctly — add `relative` to its className.

- [ ] **Edit 6: Confetti burst on Badge climax.**

  Wrap the Badge's parent `<motion.div>` in a `<div className="relative">` so confetti can absolute-position from the Badge center:

  ```tsx
  <div className="relative">
    <Confetti className="-translate-x-1/2 -translate-y-1/2" />
    <motion.div
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
    >
      <Badge ... />
    </motion.div>
  </div>
  ```

  Add `import { Confetti } from "@/components/app/confetti";`.

- [ ] **Edit 7: Badge heartbeat + lime drop-shadow.**

  Replace the existing Badge `className` with the lime drop-shadow:

  ```tsx
  <Badge
    variant="lime"
    size="lg"
    className="-rotate-3 px-6 py-3 text-display shadow-[0_4px_20px_rgba(200,255,136,0.4)]"
  >
    It&apos;s a match!
  </Badge>
  ```

  Wrap in a `motion.div` that adds the heartbeat after spring settle. The existing motion.div with spring stiffness:200 damping:12 delay:0.3 ALREADY handles the initial spring-pop. To add the heartbeat WITHOUT competing animations, layer a second `useEffect`-triggered scale animation OR change the animate prop to a keyframe array:

  ```tsx
  <motion.div
    initial={{ opacity: 0, scale: 0.4 }}
    animate={{ opacity: 1, scale: [0.4, 1, 1.05, 1] }}
    transition={{
      duration: 1.0,
      delay: 0.3,
      times: [0, 0.5, 0.75, 1],
      ease: "easeOut",
    }}
  >
    <Badge ... />
  </motion.div>
  ```

  The keyframe array gives [enter (spring-feel via easeOut + scale jump), settle, heartbeat-peak, return]. Approximates a spring + single-pulse without compounding motion library hook complexity.

  Note: this loses the literal spring type — if the implementer wants to preserve the spring physics for the initial pop AND add a separate heartbeat, use `useAnimate()` from motion/react for a two-step sequence. The keyframe array is simpler and visually close enough for SP19's scope. Use whichever is cleaner during implementation.

- [ ] Verify gates — tsc / eslint / vitest 274 (unchanged), build 48 routes.

### T5 — Smoke walk + §26 closeout + merge

**Files:**
- Modify: `PROJECT-STATUS.md`

**Steps:**

- [ ] **Step 1: E2E smoke walk** at 414×896:

  1. Seed eligible viewer + clear decisions:
     ```js
     localStorage.setItem("ahavah.profile.v1", JSON.stringify({
       firstName: "TestViewer", age: 32, sex: "male", country: "BB",
       maritalStatus: "never-married", children: 0,
       intent: "first-wife", assembly: "torah-observant", polygyny: "supports",
       verificationTags: ["government-id"], relocation: "wants-partner-willing",
       healthTags: ["non-smoker"],
     }));
     localStorage.removeItem("ahavah.decisions.v1");
     ```

  2. Visit `/match` (URL bar — direct). Observe:
     - **Walk A — Default celebration:** gradient mesh visible (subtle lime top + pink bottom radial). Lime halo pulses behind cards. Two photo cards spring in from opposite sides. After ~250ms, lime Sparkles pops in at center. After ~300ms, Badge spring-pops with one-time heartbeat + confetti burst (14 brand-colored paper shapes radiating). Subtitle text + composer + Keep swiping land last. No console errors.
     - **Walk B — Match by name:** `/match?id=adina`. Subtitle reads "You and Adina liked each other"; matched photo card's tape is pink (correct semantic). Send CTA → /chat/adina.

  3. **Walk C — Reduce-motion:** in Chrome DevTools → Rendering → emulate `prefers-reduced-motion: reduce`. Reload `/match`. Observe:
     - Confetti pieces never appear (Confetti returns null).
     - Halo opacity static at 0.3, no pulse.
     - Photo cards still enter (motion library respects reduced-motion via simpler transitions OR they appear instantly — verify).
     - Badge heartbeat skipped or instant (keyframe array still runs because motion lib's reduced-motion handling reduces duration to 0 — verify).
     - Vibration NOT fired.
     - No console errors.

  4. **Walk D — Mobile haptic verification (if testing on physical device):** if a phone is available, install the PWA and trigger a match → confirm haptic triple-pulse. If desktop-only, mark as UNVERIFIED.

  5. **Walk E — Tap targets unchanged:** measure X close (≥44px), Send (≥44px), Keep swiping (≥44px) via Playwright getBoundingClientRect.

  Screenshots:
  - `docs/screenshots/sub-plan-19-t5-celebration.png` — full celebration mid-animation (badge + confetti + sparkle visible)
  - `docs/screenshots/sub-plan-19-t5-reduce-motion.png` — same page with reduced-motion enabled (no confetti, static halo)

- [ ] **Step 2:** Append PROJECT-STATUS §26.
  - Cross-reference §24 (SP17 closure) + §25 (SP18 closure).
  - Document each of the 7 design enhancements + their motion budgets.
  - Each shipped fix anchored to a citable verification (grep / smoke step / file:line).

- [ ] **Step 3:** Full verification gates — tsc / eslint / vitest 274 / build 48 routes.

- [ ] **Step 4:** Commit docs. Merge to master via `git merge --no-ff sub-plan-19-match-celebration-polish`.

---

## Verification

Per-task:
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 270 + 4 = 274 passing
- Browser smoke walk for T2-T5

Whole-sub-plan (after T5):
- Tests: ≥274 passing.
- TypeCheck clean.
- Lint clean.
- Production build clean — 48 routes.
- End-to-end smoke walk per T5 Step 1.
- PROJECT-STATUS §26 cites verification queries per §18 rule.
- `grep -n "ahavah-halo--pulse\|ahavah-halo-pulse" src/app/globals.css src/app/match/page.tsx` → returns the keyframes + the class application.
- `grep -n "Confetti" src/app/match/page.tsx src/components/app/confetti.tsx` → returns the import + the consumer + the export.
- `grep -n "navigator.vibrate" src/app/match/page.tsx` → returns the haptic line.

---

## Self-review notes

- **Spec coverage:** All 7 frontend-design suggestions covered (confetti, halo pulse, gradient mesh, badge heartbeat, corner tape, mid-sparkle, vibration). Eighth was "lime drop-shadow under badge" — included in T4 Edit 7.
- **Placeholder scan:** Zero TBD. Every step has exact TS / CSS.
- **Type consistency:** `ConfettiPiece` shape defined in T1, consumed in T2 unchanged.
- **DRY:** Confetti is extracted as a reusable primitive (not inlined in /match) so future surfaces can reuse.
- **Scope fence:**
  - No new dependencies.
  - No new tokens.
  - No backend.
  - No copy changes (user didn't ask).
  - No tap-target changes.
  - No haptic for desktop (gracefully skipped).
- **Failure-pattern guard:**
  - All 4 skills invoked (frontend-design via Skill call; accessibility / mobile-responsive / ui-design-system applied from session content) BEFORE writing this spec. Exact pixel sizes + color tokens + motion budgets baked in. Implementers don't get placement discretion.
  - SDD per task with two-stage review.
  - §26 closure cites verifications per §18 rule.
  - Deterministic confetti (seeded PRNG) avoids React hydration mismatch.

---

## Execution

This plan is structured for `superpowers:subagent-driven-development`. 5 tasks; T1 (pure logic) first per TDD discipline. T2-T4 are integration. T5 is closeout. Each task fits a single implementer dispatch + spec review + code-quality review.

Branch: `sub-plan-19-match-celebration-polish`. Merge via `git merge --no-ff`.

---

## Deferred (not in SP19)

- **Real photo replacement** — SP21 will replace the gradient placeholders with uploaded photos. Celebration polish stays gradient-friendly so SP21 is a clean swap.
- **Sound effects on match** — out of brand for this audience.
- **Match chat preview / suggested icebreakers** — separate feature.
- **/match copy refinements** (e.g. name-aware "Send Esther a message") — user didn't ask.
- **Match history page (`/matches` is liked-you grid, not mutual-match history)** — separate feature.
- **Onboarding flow QA (SP20)** still on queue.
- **Widened 12-axis audit + Legal pages** still deferred.
