# Phase W — Agent B: Discovery + Likes + SwipeCard

_Self-contained dispatch prompt. Copy entire file as the Agent tool's `prompt` parameter, `subagent_type: "general-purpose"`, `run_in_background: true`._

---

You are **Phase W Agent B — Discovery + Likes + SwipeCard** for the Ahavah PWA.

**Worktree:** `d:/Antigravity/ahavah-web-phase-w-b` (branch: `phase-w-agent-b`)
**Logging file:** `d:/Antigravity/ahavah-web-phase-w-b/logs/phase-w-agent-b.md`

## Mission

Make `/discover` a real dating-app surface. Three pieces:

1. **Build the missing SwipeCard + SwipeDeck primitives** — this is the central interaction the dating app exists for, and it has never been implemented. Today `/discover` shows a static photo card. Replace with a panable card stack: drag horizontally, ±15° rotation, LIKE / NOPE label opacity ramp, spring-back on release, velocity-commit threshold at >1200 px/s.
2. **Wire `/discover` to the backend's `/search` endpoint** — replace the in-memory `buildDiscoverDeck(viewer, SAMPLE_PROFILES, filters)` call with a real network request that returns server-filtered, server-ranked candidates. The local `discover-engine.ts` becomes test-fixture-only legacy.
3. **Wire likes / passes to the backend** — every swipe right or left POSTs to the backend; the response tells us whether the swipe created a mutual match. On match, navigate to `/match` with the real match record.

## BEFORE YOU WRITE ANY CODE — READ IN ORDER

1. **The master plan** — `d:/Antigravity/ahavah-web/docs/phase-w-plan.md` sections 2, 4, 6.
2. **The quad-agent protocol** — `d:/Antigravity/loprofile-backend-v2/docs/quad-agent-protocol.md`.
3. **Current `/discover`** — `d:/Antigravity/ahavah-web-phase-w-b/src/app/discover/page.tsx` (whole file).
4. **Current `discover-engine.ts`** — `d:/Antigravity/ahavah-web-phase-w-b/src/lib/discover-engine.ts` (whole file).
5. **Current `/match`** — `d:/Antigravity/ahavah-web-phase-w-b/src/app/match/page.tsx`.
6. **Current `/matches`** — `d:/Antigravity/ahavah-web-phase-w-b/src/app/matches/page.tsx`.
7. **Shared API client** — `src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/storage-keys.ts`. If missing → BLOCKER.
8. **Backend endpoint signatures** — `d:/Antigravity/ahavah-api/service/api/__init__.py` lines 258–393 (search + discovery prefs) and 351–355 (skip/by-uuid).
9. **`motion/react` docs you need** — gesture API (PanInfo, useMotionValue, useTransform, drag, dragConstraints, dragElastic). Read `node_modules/motion/dist/index.d.ts` for the exact types. ~10 min.

If any file from item 7 is missing → BLOCKER.

## Hard rules (non-negotiable)

- **SwipeCard / SwipeDeck must be primitives in `src/components/app/`** — cva-driven, no inline className overrides. They're reusable atoms, not page-locked widgets.
- **60fps on mid-range mobile.** Drive the pan with `motion`'s `useMotionValue` + `useTransform` (GPU-accelerated transforms only). Don't trigger React re-renders during drag.
- **`prefers-reduced-motion` collapses the gesture to a tap-to-decide UI.** Implement a fallback: when `useReducedMotion()` returns true, render two big buttons (NOPE / LIKE) below the card instead of the swipe gesture. WCAG 2.3.3.
- **Tap targets ≥44px.** The LIKE / NOPE fallback buttons + the always-visible LIKE / NOPE icon overlays on the card.
- **Optimistic likes with rollback.** When the user swipes right, mark the candidate as liked immediately; if the backend rejects (429, 403 banned, etc.) revert the state and show a toast. Match navigation only fires after server confirms.
- **No new HTTP library, no swr/react-query.** Use `apiClient` directly.
- **Cursor pagination.** The backend's `/search` accepts `cursor` and `limit`. Prefetch the next page when the deck has ≤3 cards left so the swipe never stalls.
- **No em-dashes in user-facing copy.**
- **TDD on pure logic** — gesture-decision logic (e.g. `decideFromPan({x, vx}): "like" | "nope" | "stay"`) is a pure function and gets vitest tests. The DOM-rendered SwipeCard does NOT get unit tests (smoke-walk only).
- **One commit per task.** Sign off every commit with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Don't push, don't merge.** Orchestrator handles merge.

## File ownership

### Write (exclusively yours)

- `src/components/app/swipe-card.tsx` — NEW
- `src/components/app/swipe-deck.tsx` — NEW
- `src/lib/swipe-decision.ts` — NEW (pure: pan → like/nope/stay logic)
- `src/lib/use-discover-deck.ts` — NEW (hook: paginated `/search` + cursor management)
- `src/lib/use-decisions.ts` — NEW (hook: like/pass with optimistic state + rollback)
- `src/app/discover/page.tsx` — rewire to use SwipeDeck + use-discover-deck + use-decisions
- `src/app/match/page.tsx` — wire to real match record passed via querystring (e.g. `?matchId=<uuid>`)
- `src/app/matches/page.tsx` — replace fixtures with GET `/matches`
- `tests/lib/swipe-decision.test.ts` — NEW
- `tests/lib/use-decisions.test.ts` — NEW (mock api-client)

### Read-only

- `src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/storage-keys.ts` — orchestrator-owned
- `src/lib/profile-schema.ts` — locked
- `src/lib/discover-engine.ts` — kept for `SAMPLE_PROFILES` unit tests; no `app/` route reads it after Phase W
- `src/lib/profile-sample.ts` — kept for tests
- `src/components/ui/*`, `src/components/kibo-ui/*` — primitives
- All other app pages

## Tasks

Execute IN ORDER. One commit per task. Log before AND after each in `logs/phase-w-agent-b.md`.

### Task B.1 — Pure swipe-decision logic + tests (~30 min)

**Goal:** decide what a pan gesture means — `"like"`, `"nope"`, or `"stay"` — based on offset + velocity.

- [ ] Write `tests/lib/swipe-decision.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { decideFromPan } from "@/lib/swipe-decision";

describe("decideFromPan", () => {
  it("returns 'stay' when offset is under the commit threshold and velocity is low", () => {
    expect(decideFromPan({ offsetX: 50, velocityX: 100 })).toBe("stay");
  });

  it("returns 'like' when offset exceeds the right-commit threshold", () => {
    expect(decideFromPan({ offsetX: 160, velocityX: 0 })).toBe("like");
  });

  it("returns 'nope' when offset exceeds the left-commit threshold", () => {
    expect(decideFromPan({ offsetX: -160, velocityX: 0 })).toBe("nope");
  });

  it("commits 'like' on fast rightward fling regardless of small offset", () => {
    expect(decideFromPan({ offsetX: 40, velocityX: 1500 })).toBe("like");
  });

  it("commits 'nope' on fast leftward fling regardless of small offset", () => {
    expect(decideFromPan({ offsetX: -40, velocityX: -1500 })).toBe("nope");
  });

  it("does not commit on velocity below 1200 px/s", () => {
    expect(decideFromPan({ offsetX: 40, velocityX: 800 })).toBe("stay");
  });
});
```

- [ ] Implement `src/lib/swipe-decision.ts`:

```typescript
export const COMMIT_OFFSET_PX = 140;
export const COMMIT_VELOCITY_PX_S = 1200;

export type SwipeDecision = "like" | "nope" | "stay";

export type PanState = {
  offsetX: number;
  velocityX: number;
};

export function decideFromPan({ offsetX, velocityX }: PanState): SwipeDecision {
  if (offsetX > COMMIT_OFFSET_PX || velocityX > COMMIT_VELOCITY_PX_S) {
    return "like";
  }
  if (offsetX < -COMMIT_OFFSET_PX || velocityX < -COMMIT_VELOCITY_PX_S) {
    return "nope";
  }
  return "stay";
}
```

- [ ] Run vitest — all 6 pass.
- [ ] Commit: `feat(phase-w-b): pure swipe-decision logic with offset + velocity thresholds`.

### Task B.2 — SwipeCard primitive (~90 min)

**Goal:** a single card that handles its own pan/rotate/LIKE-NOPE-overlay drawing. Stateless from the deck's POV.

- [ ] Read existing `motion/react` usage in the codebase (e.g. `src/app/match/page.tsx`, `src/components/app/photo-slot.tsx`) to see how the team uses the library.
- [ ] Create `src/components/app/swipe-card.tsx`:

```typescript
"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Heart, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { decideFromPan, type SwipeDecision } from "@/lib/swipe-decision";

const cardVariants = cva(
  "relative w-full overflow-hidden rounded-3xl shadow-card-floating",
  {
    variants: {
      surface: {
        elevated: "bg-bg-elevated",
        flat: "bg-bg-canvas",
      },
    },
    defaultVariants: { surface: "elevated" },
  },
);

export type SwipeCardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    /** Called when the user commits the gesture. Receives "like" | "nope". */
    onCommit?: (decision: Exclude<SwipeDecision, "stay">) => void;
    /** Disables drag. Useful when this card is behind the top card in the deck. */
    interactive?: boolean;
  };

export function SwipeCard({
  children,
  className,
  surface,
  onCommit,
  interactive = true,
  ...rest
}: SwipeCardProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  // Rotate at 0.04 rad per px — ±5.6° at 140px commit threshold; ±15° at the
  // edge of a 414px viewport. Feels natural per Tinder/Bumble reference.
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsDragging(false);
    const decision = decideFromPan({
      offsetX: info.offset.x,
      velocityX: info.velocity.x,
    });
    if (decision !== "stay") {
      onCommit?.(decision);
    }
  };

  // Reduce-motion fallback: no drag, no rotation; the deck supplies tap buttons.
  if (reduceMotion || !interactive) {
    return (
      <div className={cn(cardVariants({ surface }), className)} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(cardVariants({ surface }), className, "cursor-grab active:cursor-grabbing touch-none")}
      style={{ x, rotate }}
      drag="x"
      dragElastic={0.5}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      {...rest}
    >
      {children}

      {/* LIKE overlay — top-right, lime */}
      <motion.div
        aria-hidden
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute right-6 top-6 flex items-center gap-2 rounded-full border-2 border-lime bg-lime/15 px-4 py-2 text-h3 font-extrabold uppercase text-lime backdrop-blur-sm"
      >
        <Heart className="size-5" /> Like
      </motion.div>

      {/* NOPE overlay — top-left, pink */}
      <motion.div
        aria-hidden
        style={{ opacity: nopeOpacity }}
        className="pointer-events-none absolute left-6 top-6 flex items-center gap-2 rounded-full border-2 border-pink bg-pink/15 px-4 py-2 text-h3 font-extrabold uppercase text-pink backdrop-blur-sm"
      >
        <X className="size-5" /> Nope
      </motion.div>
    </motion.div>
  );
}
```

- [ ] Smoke-walk: `pnpm dev`. Open `/discover` once you've wired it (B.5). For now, you can write a temporary preview page at `/_preview/swipe-card` if you want a sandbox; delete it after the real wiring is done.
- [ ] Commit: `feat(phase-w-b): SwipeCard primitive with pan + rotation + LIKE/NOPE overlays`.

### Task B.3 — SwipeDeck primitive (~60 min)

**Goal:** stacks N visible cards (default 3), commits the top card's decision, reveals the next.

- [ ] Create `src/components/app/swipe-deck.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Heart, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SwipeCard } from "./swipe-card";
import type { SwipeDecision } from "@/lib/swipe-decision";

export type DeckItem = {
  id: string;
  render: () => React.ReactNode;
};

export type SwipeDeckProps = {
  items: ReadonlyArray<DeckItem>;
  /** Called when an item is dismissed (either direction). */
  onDecide: (item: DeckItem, decision: Exclude<SwipeDecision, "stay">) => void;
  /** When the deck has this few items left, fire onNeedMore so the parent can paginate. */
  pageThreshold?: number;
  onNeedMore?: () => void;
  emptyState?: React.ReactNode;
  className?: string;
};

const VISIBLE_COUNT = 3;

export function SwipeDeck({
  items,
  onDecide,
  pageThreshold = 3,
  onNeedMore,
  emptyState,
  className,
}: SwipeDeckProps) {
  const reduceMotion = useReducedMotion();
  const visible = items.slice(0, VISIBLE_COUNT);

  const handleCommit = useCallback((decision: Exclude<SwipeDecision, "stay">) => {
    const top = items[0];
    if (!top) return;
    onDecide(top, decision);
    if (items.length - 1 <= pageThreshold) {
      onNeedMore?.();
    }
  }, [items, onDecide, onNeedMore, pageThreshold]);

  if (items.length === 0) {
    return <div className={cn("flex flex-1 items-center justify-center", className)}>{emptyState}</div>;
  }

  return (
    <div className={cn("relative flex w-full flex-1 flex-col gap-6", className)}>
      <div className="relative flex-1">
        <AnimatePresence>
          {visible.map((item, index) => {
            const isTop = index === 0;
            const offsetY = index * 8;
            const scale = 1 - index * 0.04;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: offsetY, scale }}
                exit={{
                  opacity: 0,
                  x: 0,
                  transition: { duration: 0.2 },
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
                style={{ zIndex: VISIBLE_COUNT - index }}
              >
                <SwipeCard
                  interactive={isTop}
                  onCommit={(decision) => handleCommit(decision)}
                  className="h-full"
                >
                  {item.render()}
                </SwipeCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Tap-button fallback — always rendered for accessibility, takes the place
         of the gesture in reduce-motion. WCAG 2.5.1: gesture has a single-tap
         alternative. */}
      <div
        className={cn(
          "flex items-center justify-center gap-6",
          reduceMotion ? "" : "lg:hidden",
        )}
      >
        <Button
          size="circle"
          tone="elevated"
          aria-label="Pass"
          onClick={() => handleCommit("nope")}
          className="border-2 border-pink/40"
        >
          <X className="text-pink" />
        </Button>
        <Button
          size="circle"
          tone="elevated"
          aria-label="Like"
          onClick={() => handleCommit("like")}
          className="border-2 border-lime/40"
        >
          <Heart className="text-lime" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] Commit: `feat(phase-w-b): SwipeDeck stacks SwipeCards with pagination signal`.

### Task B.4 — `use-discover-deck` hook + tests (~45 min)

**Goal:** wraps `GET /search` with cursor pagination. Returns the running list of candidates + a `loadMore()` callback.

- [ ] Write `tests/lib/use-discover-deck.test.ts` (mock api-client). Cases: empty initial result; one page; two pages; cursor preserved; error path leaves last good state.
- [ ] Implement `src/lib/use-discover-deck.ts`:

```typescript
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Profile } from "@/lib/profile-schema";
import { apiClient, ApiError } from "@/lib/api-client";

export type DiscoverFilters = {
  ageMin?: number;
  ageMax?: number;
  countries?: ReadonlyArray<string>;
  languages?: ReadonlyArray<string>;
  // ... extend as backend supports
};

export type DiscoverCandidate = Profile & { id: string };

export type DiscoverDeckResult = {
  items: DiscoverCandidate[];
  loadMore: () => Promise<void>;
  isLoading: boolean;
  error: ApiError | null;
  hasMore: boolean;
};

type SearchResponse = {
  results: ReadonlyArray<DiscoverCandidate>;
  next_cursor: string | null;
};

export function useDiscoverDeck(filters: DiscoverFilters): DiscoverDeckResult {
  const [items, setItems] = useState<DiscoverCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const inFlight = useRef(false);

  const loadMore = useCallback(async () => {
    if (inFlight.current || !hasMore) return;
    inFlight.current = true;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (filters.ageMin) params.set("age_min", String(filters.ageMin));
      if (filters.ageMax) params.set("age_max", String(filters.ageMax));
      if (filters.countries?.length) params.set("countries", filters.countries.join(","));
      if (filters.languages?.length) params.set("languages", filters.languages.join(","));
      const path = `/search?${params.toString()}`;
      const res = await apiClient.get<SearchResponse>(path);
      setItems((prev) => [...prev, ...res.results]);
      setCursor(res.next_cursor);
      setHasMore(res.next_cursor !== null);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err);
    } finally {
      setIsLoading(false);
      inFlight.current = false;
    }
  }, [cursor, filters, hasMore]);

  // Initial load when filters change.
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { items, loadMore, isLoading, error, hasMore };
}
```

- [ ] Commit: `feat(phase-w-b): use-discover-deck hook with cursor pagination`.

### Task B.5 — `use-decisions` hook + tests (~45 min)

**Goal:** like / pass actions with optimistic local state and rollback on server error. Returns the match-record when a like creates a mutual match.

- [ ] Write tests covering: optimistic like, server rejects → rollback, mutual match returned, pass POST shape.
- [ ] Implement `src/lib/use-decisions.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";

type DecisionResponse = {
  match: { match_id: string; with_profile_id: string } | null;
};

export type DecideResult = {
  matchId: string | null;
};

export function useDecisions() {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<ApiError | null>(null);

  const decide = useCallback(
    async (
      candidateId: string,
      decision: "like" | "nope",
    ): Promise<DecideResult> => {
      setPendingIds((prev) => new Set(prev).add(candidateId));
      setError(null);
      try {
        const body = { profile_uuid: candidateId, decision };
        // Backend endpoint is /skip/by-uuid for the "pass" case in Duolicious; for likes,
        // we use a partner endpoint. Confirm exact path in Foundation block at bottom of brief.
        const res = await apiClient.post<DecisionResponse>("/decision", body);
        return { matchId: res.match?.match_id ?? null };
      } catch (err) {
        if (err instanceof ApiError) setError(err);
        throw err;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      }
    },
    [],
  );

  return { decide, pendingIds, error };
}
```

- [ ] **Note:** the exact endpoint path is documented in the Foundation block at the bottom of this brief. If it differs from `/decision`, update accordingly.
- [ ] Commit: `feat(phase-w-b): use-decisions hook with optimistic + rollback`.

### Task B.6 — Rewire `/discover` (~60 min)

**Goal:** replace the static card with `SwipeDeck` driven by `use-discover-deck` + `use-decisions`.

- [ ] Open `src/app/discover/page.tsx`. Note the current shape — it imports `SAMPLE_PROFILES` and `buildDiscoverDeck`.
- [ ] Rewrite:

```typescript
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { SwipeDeck, type DeckItem } from "@/components/app/swipe-deck";
import { EmptyState } from "@/components/app/empty-state";
import { useDiscoverDeck } from "@/lib/use-discover-deck";
import { useDecisions } from "@/lib/use-decisions";
import { useProfile } from "@/lib/use-profile";
// ... existing imports for filters, page shell, etc.

export default function DiscoverPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const filters = useFilters();  // existing hook for /discover filters; check current import
  const { items, loadMore, isLoading } = useDiscoverDeck(filters);
  const { decide } = useDecisions();

  const handleDecide = useCallback(
    async (item: DeckItem, decision: "like" | "nope") => {
      try {
        const result = await decide(item.id, decision);
        if (decision === "like" && result.matchId) {
          router.push(`/match?matchId=${result.matchId}`);
        }
      } catch {
        // ApiError surfaced via the hook's `error`; UI can show a toast in a follow-up.
      }
    },
    [decide, router],
  );

  const deckItems: DeckItem[] = items.map((c) => ({
    id: c.id,
    render: () => <DiscoverCardFace candidate={c} />,
  }));

  return (
    <PageShell>
      <PageHeader>...filters sheet trigger...</PageHeader>
      <SwipeDeck
        items={deckItems}
        onDecide={handleDecide}
        onNeedMore={loadMore}
        emptyState={
          <EmptyState
            variant="no-matches"
            title="You're all caught up."
            description="Try widening your filters or check back later."
          />
        }
      />
    </PageShell>
  );
}
```

- [ ] Extract `<DiscoverCardFace candidate={c} />` as a local component (or new file `src/components/app/discover-card-face.tsx` if it grows past ~80 lines) — it shows photo + name + age + verification badges + bio preview.
- [ ] Confirm `SAMPLE_PROFILES` is no longer imported by `src/app/discover/page.tsx`. `grep -r "SAMPLE_PROFILES" src/app/` should return nothing.
- [ ] Smoke-walk: with 10 seed accounts in the production DB, sign in as one, open `/discover`. See real cards. Swipe.
- [ ] Commit: `feat(phase-w-b): /discover wires SwipeDeck + real /search endpoint`.

### Task B.7 — Rewire `/match` to real match record (~30 min)

- [ ] Open `src/app/match/page.tsx`. Note it currently uses static fixtures.
- [ ] Read `matchId` from `useSearchParams()`. If present, GET `/match/<matchId>` (or whatever endpoint the backend exposes — confirm in Foundation block) to fetch the matched profile. If missing/error, show the SP19 confetti+celebration but fall back to a generic "You matched!" without specific user data.
- [ ] **Preserve the SP19 motion budget carve-out** — do NOT tighten the 1.0s badge climax or the cascading card delays. This is a celebration screen, exempt from the ≤500ms entrance budget per `docs/motion-budget.md`.
- [ ] Wire the "Send a message" CTA to `/chat/<matchId>` (Agent D will pick up the chat-side wiring).
- [ ] Commit: `feat(phase-w-b): /match reads real match record from querystring`.

### Task B.8 — Rewire `/matches` list (~30 min)

- [ ] Open `src/app/matches/page.tsx`.
- [ ] Replace fixtures with a `useEffect` that GETs `/matches` (backend endpoint — confirm exact path in Foundation block; likely `/inbox-info` returns both unread chats + mutual-match records).
- [ ] Loading state = `<Skeleton>` list. Empty state = existing EmptyState variant.
- [ ] Each row clicks to `/profile/<id>?from=matches` (the existing routing pattern).
- [ ] Commit: `feat(phase-w-b): /matches reads real match list from backend`.

### Task B.9 — Final verification (~30 min)

- [ ] `pnpm exec tsc --noEmit` clean.
- [ ] `pnpm exec eslint --max-warnings=0` clean on all touched files.
- [ ] `pnpm exec vitest run` — 306 baseline + your new tests (target: ≥315).
- [ ] `pnpm build` clean.
- [ ] **End-to-end smoke walk:**
  1. Open `http://localhost:3000` in incognito. Sign in with a seed account.
  2. Navigate to `/discover`. See real candidates (not the 8 fixtures).
  3. Swipe right twice, left twice — confirm DevTools Network shows 4 POST requests.
  4. Use a seed account that has a pre-arranged mutual with another seed account. Swipe right on that match. Land on `/match` with the real match details, see SP19 celebration animation.
  5. Tap "Send a message" → land on `/chat/<id>` (this may show a stub until Agent D merges; that's OK).
  6. Navigate to `/matches`. See the new match in the list.
  7. Toggle reduce-motion in OS. Reload `/discover`. Confirm cards no longer drag; LIKE / NOPE buttons below the card work.
  8. Open `/discover` on a 414×896 viewport (DevTools device emulation). Swipe should feel smooth — no jank during drag.

- [ ] Emit COMPLETE:

```
COMPLETE: Agent B
Tasks: 9/9 completed
Files changed:
 - src/components/app/swipe-card.tsx (new)
 - src/components/app/swipe-deck.tsx (new)
 - src/components/app/discover-card-face.tsx (new, if extracted)
 - src/lib/swipe-decision.ts (new)
 - src/lib/use-discover-deck.ts (new)
 - src/lib/use-decisions.ts (new)
 - src/app/discover/page.tsx (rewired)
 - src/app/match/page.tsx (rewired, motion budget preserved)
 - src/app/matches/page.tsx (rewired)
 - tests/lib/swipe-decision.test.ts (new)
 - tests/lib/use-discover-deck.test.ts (new)
 - tests/lib/use-decisions.test.ts (new)
Issues: [or none]
Verification: typecheck + lint + vitest + build + e2e smoke walk all pass.
```

## BLOCKER format

```
BLOCKER: Agent B
Task: [task ID like B.5]
Error: [error]
Attempted: [what you tried twice]
Need: [what would unblock]
```

## Logging format (`logs/phase-w-agent-b.md`)

Same shape as Agent A — timestamped entries before/after each task.

---

## Wave 1 Foundation — files now live

_Filled by orchestrator before dispatch. If you see "TO BE FILLED", BLOCKER._

### Endpoints you'll use

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/search?cursor=&age_min=&age_max=&countries=&languages=` | Ranked + filtered candidate page | querystring | `{ results: DiscoverCandidate[], next_cursor: string \| null }` |
| POST | `/decision` (TO CONFIRM in F.3 — may be `/skip/by-uuid` for nope and a separate `/like/by-uuid` for like) | Record like/pass | `{ profile_uuid, decision: "like" \| "nope" }` | `{ match: { match_id, with_profile_id } \| null }` |
| GET | `/matches` (TO CONFIRM — may be sub-resource of `/inbox-info`) | List mutual matches | none | `{ matches: Match[] }` |
| GET | `/match/<match_id>` (TO CONFIRM) | One match record + matched profile | none | `Match & { profile: Partial<Profile> }` |

If any of the "TO CONFIRM" endpoints don't exist in the backend at the path shown, BLOCKER — orchestrator extends `api-types.ts`.

### `discover-engine.ts` reuse

The existing `discover-engine.ts` filter / scoring logic stays in the repo for test fixtures, but `/discover` no longer calls it. Filter state in the UI (FiltersSheet) maps to the `DiscoverFilters` shape this brief defines — confirm the field names match what the backend `/search` accepts.

### SwipeCard a11y reference

The reduce-motion fallback (tap buttons instead of drag) satisfies WCAG 2.5.1 (Pointer Gestures — must have non-gesture alternative). Document this in a code comment in `swipe-card.tsx`.

---

**Begin Task B.1 when ready. Log first, then work.**
