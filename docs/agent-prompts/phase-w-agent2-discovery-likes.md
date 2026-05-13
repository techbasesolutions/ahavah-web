# Phase W — Agent 2: Discovery + Likes + SwipeCard

> **Trigger phrase**: This agent waits for the user to type **`You are Agent 2, execute`** in the terminal. Do not begin Task 2.0 / 2.1 until that phrase appears. Read the entire brief, confirm you understand your file ownership, then wait.

_Self-contained dispatch prompt. Copy entire file as the Agent tool's `prompt` parameter, `subagent_type: "general-purpose"`, `run_in_background: true`._

---

You are **Phase W Agent 2 — Discovery + Likes + SwipeCard** for the Ahavah PWA.

**Worktree:** `d:/Antigravity/ahavah-web-phase-w-2` (branch: `phase-w-agent-2`)
**Logging file:** `d:/Antigravity/ahavah-web-phase-w-2/logs/agent-2-discovery-likes.md`

## Mission

Make `/discover` a real dating-app surface. Three pieces:

1. **Build the missing SwipeCard + SwipeDeck primitives** — this is the central interaction the dating app exists for, and it has never been implemented. Today `/discover` shows a static photo card. Replace with a panable card stack: drag horizontally, ±15° rotation, LIKE / NOPE label opacity ramp, spring-back on release, velocity-commit threshold at >1200 px/s.
2. **Wire `/discover` to the backend's `/search` endpoint** — replace the in-memory `buildDiscoverDeck(viewer, SAMPLE_PROFILES, filters)` call with a real network request that returns server-filtered, server-ranked candidates. The local `discover-engine.ts` becomes test-fixture-only legacy.
3. **Wire likes / passes to the backend** — every swipe right or left POSTs to the backend; the response tells us whether the swipe created a mutual match. On match, navigate to `/match` with the real match record.

## BEFORE YOU WRITE ANY CODE — READ IN ORDER

1. **The master plan** — `d:/Antigravity/ahavah-web/docs/phase-w-plan.md` sections 2, 4, 6.
2. **The quad-agent protocol** — `d:/Antigravity/loprofile-backend-v2/docs/quad-agent-protocol.md`.
3. **Current `/discover`** — `d:/Antigravity/ahavah-web-phase-w-2/src/app/discover/page.tsx` (whole file).
4. **Current `discover-engine.ts`** — `d:/Antigravity/ahavah-web-phase-w-2/src/lib/discover-engine.ts` (whole file).
5. **Current `/match`** — `d:/Antigravity/ahavah-web-phase-w-2/src/app/match/page.tsx`.
6. **Current `/matches`** — `d:/Antigravity/ahavah-web-phase-w-2/src/app/matches/page.tsx`.
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

Execute IN ORDER. One commit per task. Log before AND after each in `logs/agent-2-discovery-likes.md`.

### Task 2.1 — Pure swipe-decision logic + tests (~30 min)

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
- [ ] Commit: `feat(phase-w-agent-2): pure swipe-decision logic with offset + velocity thresholds`.

### Task 2.2 — SwipeCard primitive (~90 min)

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

- [ ] Smoke-walk: `pnpm dev`. Open `/discover` once you've wired it (2.5). For now, you can write a temporary preview page at `/_preview/swipe-card` if you want a sandbox; delete it after the real wiring is done.
- [ ] Commit: `feat(phase-w-agent-2): SwipeCard primitive with pan + rotation + LIKE/NOPE overlays`.

### Task 2.3 — SwipeDeck primitive (~60 min)

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

- [ ] Commit: `feat(phase-w-agent-2): SwipeDeck stacks SwipeCards with pagination signal`.

### Task 2.4 — `use-discover-deck` hook + tests (~45 min)

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

- [ ] Commit: `feat(phase-w-agent-2): use-discover-deck hook with cursor pagination`.

### Task 2.5 — `use-decisions` hook + tests (~45 min)

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
- [ ] Commit: `feat(phase-w-agent-2): use-decisions hook with optimistic + rollback`.

### Task 2.6 — Rewire `/discover` (~60 min)

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
- [ ] Commit: `feat(phase-w-agent-2): /discover wires SwipeDeck + real /search endpoint`.

### Task 2.7 — Rewire `/match` to real match record (~30 min)

- [ ] Open `src/app/match/page.tsx`. Note it currently uses static fixtures.
- [ ] Read `matchId` from `useSearchParams()`. If present, GET `/match/<matchId>` (or whatever endpoint the backend exposes — confirm in Foundation block) to fetch the matched profile. If missing/error, show the SP19 confetti+celebration but fall back to a generic "You matched!" without specific user data.
- [ ] **Preserve the SP19 motion budget carve-out** — do NOT tighten the 1.0s badge climax or the cascading card delays. This is a celebration screen, exempt from the ≤500ms entrance budget per `docs/motion-budget.md`.
- [ ] Wire the "Send a message" CTA to `/chat/<matchId>` (Agent 4 will pick up the chat-side wiring).
- [ ] Commit: `feat(phase-w-agent-2): /match reads real match record from querystring`.

### Task 2.8 — Rewire `/matches` list (~30 min)

- [ ] Open `src/app/matches/page.tsx`.
- [ ] Replace fixtures with a `useEffect` that GETs `/matches` (backend endpoint — confirm exact path in Foundation block; likely `/inbox-info` returns both unread chats + mutual-match records).
- [ ] Loading state = `<Skeleton>` list. Empty state = existing EmptyState variant.
- [ ] Each row clicks to `/profile/<id>?from=matches` (the existing routing pattern).
- [ ] Commit: `feat(phase-w-agent-2): /matches reads real match list from backend`.

### Task 2.9 — Final verification (~30 min)

- [ ] `pnpm exec tsc --noEmit` clean.
- [ ] `pnpm exec eslint --max-warnings=0` clean on all touched files.
- [ ] `pnpm exec vitest run` — 306 baseline + your new tests (target: ≥315).
- [ ] `pnpm build` clean.
- [ ] **End-to-end smoke walk:**
  1. Open `http://localhost:3000` in incognito. Sign in with a seed account.
  2. Navigate to `/discover`. See real candidates (not the 8 fixtures).
  3. Swipe right twice, left twice — confirm DevTools Network shows 4 POST requests.
  4. Use a seed account that has a pre-arranged mutual with another seed account. Swipe right on that match. Land on `/match` with the real match details, see SP19 celebration animation.
  5. Tap "Send a message" → land on `/chat/<id>` (this may show a stub until Agent 4 merges; that's OK).
  6. Navigate to `/matches`. See the new match in the list.
  7. Toggle reduce-motion in OS. Reload `/discover`. Confirm cards no longer drag; LIKE / NOPE buttons below the card work.
  8. Open `/discover` on a 414×896 viewport (DevTools device emulation). Swipe should feel smooth — no jank during drag.

- [ ] Emit COMPLETE:

```
COMPLETE: Agent 2
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
BLOCKER: Agent 2
Task: [task ID like 2.5]
Error: [error]
Attempted: [what you tried twice]
Need: [what would unblock]
```

## Logging format (`logs/agent-2-discovery-likes.md`)

Same shape as Agent 1 — timestamped entries before/after each task.

---

## Wave 1 Foundation — files now live

Agent 0 (the IDE orchestrator) has completed Foundation work. Concrete
values for your prompts:

### Backend (ahavah-api)

- **Repo**: `d:/Antigravity/ahavah-api/` on branch `ahavah/main`. Deployed
  to DigitalOcean droplet `ahavah-api-prod-01` (id 570650212, $24/mo
  s-2vcpu-4gb, nyc3 region). SSH key: `C:/Users/Ehud/.ssh/id_ed25519_ahavah`.
- **API base URL (REST)**: `http://167.71.93.27:5000` — set in
  `.env.local` as `NEXT_PUBLIC_API_BASE_URL`. Plain HTTP (no SSL yet
  because `ahavah.app` domain isn't registered).
- **WebSocket URL (chat)**: `ws://167.71.93.27:5443` — set in
  `.env.local` as `NEXT_PUBLIC_CHAT_WS_URL`.
- **Health check**: `curl http://167.71.93.27:5000/health` returns
  `status: ok` (verified during Foundation).

### Frontend foundation (already on master)

These files exist on `master` at commit `7bbf212` and beyond. Every
worktree branched from this commit, so they're already in your tree:

- `src/lib/api-client.ts` — fetch wrapper with `credentials: 'include'`,
  methods `get` / `post` / `patch` / `delete` / `postMultipart` (the
  multipart variant uses XHR for upload progress; the others use fetch).
  Throws `ApiError` (`.status` + `.body` + `.message`) on non-2xx.
- `src/lib/api-types.ts` — hand-written TypeScript types for every
  endpoint group. Source-of-truth comments cite the matching
  `service/api/__init__.py` line ranges in the backend repo.
- `src/lib/storage-keys.ts` — constants for localStorage keys
  (`PROFILE_CACHE_KEY`, `DECISIONS_CACHE_KEY`, `FILTERS_CACHE_KEY`,
  `PENDING_EMAIL_KEY`, `MAP_FIRST_MOUNT_KEY`).

### Auth / OTP

- Email-only OTP via Resend (no SMS / Twilio in Phase W — deferred).
- OTP from-address is `onboarding@resend.dev` (universal Resend
  placeholder). Real Ahavah branding lands when `ahavah.app` is
  registered + verified in Resend.
- Session is delivered as an httpOnly cookie named `duo_session`. The
  backend sets it on `Set-Cookie` from `/check-otp`. `api-client.ts`'s
  `credentials: 'include'` carries it back automatically.
- During dev: emails to `*@example.com` use OTP code `000000` (no real
  send). For real OTPs use a gmail / outlook / etc. address — the
  backend's `good_email_domain` table restricts which providers pass.

### Database schema

The backend's Postgres database is `duo_api` on `postgres:16` with
pgvector + postgis extensions. 74 tables from the upstream Duolicious
schema plus the Phase W migrations:

- `swipe` (subject, object, direction, created_at) — like/pass record
- `hide_and_block` — block list
- `message_translation` — DeepL translation cache (Phase 2)
- `photo_moderation_*` — moderation queue (Phase 4)
- `entitlement_event` — IAP ledger (Phase 5)
- `ahavah_verification_tier` ENUM type — `'none' | 'bronze' | 'silver' | 'gold'`
- `person.ahavah_verification_tier` column (default `'none'`)

### Storage (photos)

- DigitalOcean Spaces bucket `ahavah-photos-prod` in `nyc3`.
- CDN URL pattern: `https://ahavah-photos-prod.nyc3.cdn.digitaloceanspaces.com/<uuid>.jpg`
- Backend handles NSFW moderation via the existing ONNX classifier
  before approving uploads.

### What's deferred (don't try to wire these)

- **Stripe** (verification + paywall): deferred to Cutover. The
  `/verification/start-id-flow` and `/checkout/web` endpoints exist
  but `STRIPE_SECRET_KEY` is empty in production env, so they no-op.
- **Twilio**: no SMS OTP path. Email-only.
- **SSL / domain**: no `ahavah.app`. Plain HTTP on droplet IP.
- **Sentry / PostHog**: env vars unset, telemetry no-ops.

### Logs go to

`d:/Antigravity/ahavah-web/logs/agent-2-discovery-likes.md` on the master
repo (NOT inside your worktree). The `logs/` directory was created
by Agent 0 during F.5. Append-only; one entry per major step
(started + completed).

### Communication protocol (reminder)

When you hit a 2-attempt failure → emit a `BLOCKER:` block (template
in the brief above). When you finish all tasks → emit a `COMPLETE:`
block. Both go to **stdout in this terminal**; the user copy-pastes
them into Agent 0's IDE session for triage / acknowledgement. Agent 0
cannot see your terminal output directly.

### Caveat: empty `/search` results are expected initially

The production `/search` endpoint may not yet return real candidates
because no users are seeded. Build the SwipeDeck + SwipeCard primitives
+ the wiring; if `/search` returns empty arrays, render the EmptyState.
Agent 0 will manually create test users via the seeded-account flow
(during F.4) before the swipe e2e test in Task 2.9. The wiring itself
must still be in place at the end of your run regardless of seed state.

---

**Begin Task 2.1 when ready. Log first, then work.**
