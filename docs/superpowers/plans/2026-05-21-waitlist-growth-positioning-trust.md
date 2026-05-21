# Waitlist Growth, Positioning & Trust Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the Ahavah waitlist (real live count + an in-app Instagram share card) and sharpen the marketing: Torah-observant positioning copy, modesty guidance, and privacy/verification trust messaging.

**Architecture:** Backend adds one public `GET /waitlist/count` route over the existing `waitlist_signup` table. Frontend adds a count hook/display (with a social-proof floor), a Canvas-rendered share card on the waitlist completion screen, and copy edits to the landing, photos, and community-guidelines pages. All UI uses existing kit primitives; all user-facing strings avoid the em-dash character.

**Tech Stack:** Flask + psycopg + Postgres (api); Next.js 16 + React 19 + Tailwind v4 + kit components (web). Backend tests via pytest in the docker harness (`reference_ahavah_windows_test_harness`). Frontend verified via `tsc --noEmit` + `next build` + lint-staged eslint + manual.

**Spec:** `docs/superpowers/specs/2026-05-21-waitlist-growth-positioning-trust-design.md`

**Repos:** api `ahavah/main` (deploy via push + GHA droplet run); web `master` (Vercel on push). Commit trailer: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Stage files by name; check `git status` before each commit (working tree carries unrelated noise — never `git add -A`).

---

## File Structure

**`ahavah-api`:**
- `service/waitlist/__init__.py` — add `count(tx) -> int`.
- `service/api/waitlist_routes.py` — add `GET /waitlist/count`.
- `tests/test_waitlist.py` — add count test.

**`ahavah-web`:**
- `src/lib/waitlist.ts` — add `getWaitlistCount()`.
- `src/components/app/waitlist-count.tsx` — `useWaitlistCount()` hook + `WAITLIST_COUNT_FLOOR`.
- `src/components/app/waitlist-share-card.tsx` — Canvas image + Save/Share/Copy buttons + on-screen preview.
- `src/app/page.tsx` — live count in hero stats; "Who it's for" band; privacy block in `#verified`; inline-success share link.
- `src/app/waitlist/page.tsx` — fetch count post-submit; render `#N` + `<WaitlistShareCard>` on completion.
- `src/app/onboarding/photos/page.tsx` — modesty guideline block.
- `src/app/legal/community-guidelines/page.tsx` — "Be modest" section.

---

### Task 1: Backend — waitlist count service + route

**Files:**
- Modify: `service/waitlist/__init__.py`
- Modify: `service/api/waitlist_routes.py`
- Test: `tests/test_waitlist.py`

- [ ] **Step 1: Write the failing test.** Append to `tests/test_waitlist.py`:

```python
def test_count_reflects_rows(email):
    from database import api_tx
    from service.waitlist import upsert, count
    with api_tx() as tx:
        before = count(tx)
        upsert(tx, email, {"sex": "male"})
        after = count(tx)
        assert after == before + 1
```

- [ ] **Step 2: Run it, verify it fails.** In the harness (see `reference_ahavah_windows_test_harness`):

Run: `pytest tests/test_waitlist.py::test_count_reflects_rows -v`
Expected: FAIL with `ImportError: cannot import name 'count'`.

- [ ] **Step 3: Implement `count()`.** In `service/waitlist/__init__.py`, after the `_Q_GET` block + `get()` function, add:

```python
_Q_COUNT = "SELECT count(*) AS n FROM waitlist_signup"


def count(tx) -> int:
    return tx.execute(_Q_COUNT).fetchone()["n"]
```

- [ ] **Step 4: Run the test, verify it passes.**

Run: `pytest tests/test_waitlist.py::test_count_reflects_rows -v`
Expected: PASS.

- [ ] **Step 5: Add the public route.** In `service/api/waitlist_routes.py`, change the imports + add the handler:

Replace:
```python
from service.api.decorators import post, validate, shared_otp_limit
from database import api_tx
from service.waitlist import upsert
```
with:
```python
from service.api.decorators import get, post, validate, shared_otp_limit
from database import api_tx
from service.waitlist import upsert, count as waitlist_count
```

Then append at the end of the file:
```python
@get('/waitlist/count')
def get_waitlist_count():
    # Public social-proof count. Flask serializes the dict to JSON.
    with api_tx() as tx:
        n = waitlist_count(tx)
    return {'count': n}
```

- [ ] **Step 6: Smoke the route + import.** In the harness:

Run: `python -c "import service.api"`
Expected: no error (route registers).

If the harness exposes the app, also confirm `GET /waitlist/count` returns `{"count": <int>}` (200). If not reachable in-harness, the deploy smoke (Task 8) covers it.

- [ ] **Step 7: Commit.**

```bash
git add service/waitlist/__init__.py service/api/waitlist_routes.py tests/test_waitlist.py
git commit -m "feat(waitlist): public GET /waitlist/count for live social proof"
```

---

### Task 2: Frontend — count client + hook + floor

**Files:**
- Modify: `src/lib/waitlist.ts`
- Create: `src/components/app/waitlist-count.tsx`

- [ ] **Step 1: Add the client call.** At the end of `src/lib/waitlist.ts` (after `postWaitlist`):

```ts
export async function getWaitlistCount(): Promise<{ count: number }> {
  return apiClient.get<{ count: number }>("/waitlist/count");
}
```

- [ ] **Step 2: Create the hook + floor.** Create `src/components/app/waitlist-count.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import { getWaitlistCount } from "@/lib/waitlist";

/** Below this, the raw number is weak social proof, so we hide it and show
 *  "Be among the first" copy instead. */
export const WAITLIST_COUNT_FLOOR = 50;

/** Fetch the live waitlist count once on mount. Returns null while loading or
 *  on error — the count is decorative social proof, never an error surface. */
export function useWaitlistCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getWaitlistCount()
      .then((r) => {
        if (alive) setCount(r.count);
      })
      .catch(() => {
        /* decorative: ignore */
      });
    return () => {
      alive = false;
    };
  }, []);
  return count;
}

/** True when the count is real and above the social-proof floor. */
export function aboveFloor(count: number | null): count is number {
  return typeof count === "number" && count >= WAITLIST_COUNT_FLOOR;
}
```

- [ ] **Step 3: Typecheck.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/waitlist.ts src/components/app/waitlist-count.tsx
git commit -m "feat(waitlist): getWaitlistCount client + useWaitlistCount hook with social-proof floor"
```

---

### Task 3: Frontend — live count in the hero stats

**Files:**
- Modify: `src/app/page.tsx` (imports; the `LandingPage` component body; the hero stats grid ~line 261-286)

Context: the hero stats grid currently hardcodes `{ num: "12,400", suffix: "+", lbl: "on the waitlist" }` and `{ num: "63", suffix: "", lbl: "countries" }` (fabricated). Replace the waitlist stat with the live count + floor copy, and change the fabricated "63 countries" to "Worldwide".

- [ ] **Step 1: Import the hook.** Add to the imports near the other `@/components/app/...` imports in `src/app/page.tsx`:

```ts
import { useWaitlistCount, aboveFloor } from "@/components/app/waitlist-count";
```

- [ ] **Step 2: Call the hook.** Inside the default-export `LandingPage` component (the one that owns the hero form state — same component that defines `email`/`handleSubmit`), add near the top of the component body, beside the other hooks:

```ts
const waitlistCount = useWaitlistCount();
```

- [ ] **Step 3: Replace the stats grid** (the `<div className="grid grid-cols-3 ...">` block, ~lines 261-286). Replace the hardcoded array map with a count-aware version. New block:

```tsx
{/* ── Stats ────────────────────────────────────────────────── */}
<div className="grid grid-cols-3 gap-6 mt-14 max-w-[520px]" aria-label="Pre-launch interest">
  {[
    aboveFloor(waitlistCount)
      ? { num: waitlistCount.toLocaleString(), suffix: "", lbl: "on the waitlist" }
      : { num: "Early", suffix: "", lbl: "be among the first" },
    { num: "Worldwide", suffix: "", lbl: "diaspora reach" },
    { num: "100", suffix: "+", lbl: "languages" },
  ].map(({ num, suffix, lbl }) => (
    <div key={lbl} className="min-w-0 text-center">
      <div
        className="text-(--ink) tabular-nums"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(22px, 2.6vw, 40px)",
          fontWeight: 400,
          letterSpacing: "-0.015em",
          lineHeight: 1,
        }}
      >
        {num}
        <span className="text-(--color-lime)">{suffix}</span>
      </div>
      <div className="mt-2 text-[12px] lg:text-[13px] tracking-[0.02em] text-(--ink-2)">
        {lbl}
      </div>
    </div>
  ))}
</div>
```

(Note: the min font-size in the clamp drops from 28px to 22px because "Worldwide" is a long word and must not overflow on a 3-column mobile grid.)

- [ ] **Step 4: Typecheck + build.**

Run: `npx tsc --noEmit && npx next build`
Expected: no errors; "Compiled successfully".

- [ ] **Step 5: Commit.**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): hero shows live waitlist count (with floor), drops fabricated 12,400/63"
```

---

### Task 4: Frontend — Instagram share card on completion

**Files:**
- Create: `src/components/app/waitlist-share-card.tsx`
- Modify: `src/app/waitlist/page.tsx` (fetch count post-submit; render the card on the done screen)

- [ ] **Step 1: Create the share card.** Create `src/components/app/waitlist-share-card.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo-mark";

const STORY_W = 1080;
const STORY_H = 1920;
const SHARE_URL = "https://ahavah.app";
const CAPTION =
  "I just joined the Ahavah waitlist. Torah-observant matchmaking for serious believers, aligned in Torah, faith, family, and covenant. Join me: ahavah.app";

// Draw the 9:16 story image to an offscreen canvas and resolve a PNG blob.
// Uses a plain bold sans stack: webfonts are not reliably nameable on canvas
// (next/font hashes the family), so we accept the system sans fallback for the
// downloadable image. The on-screen preview below uses the real brand fonts.
async function drawStory(position: number | null): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, STORY_W, STORY_H);
  grad.addColorStop(0, "#1a1340");
  grad.addColorStop(1, "#3b2f7a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Brand mark (same-origin SVG; best-effort).
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 200;
      ctx.drawImage(img, (STORY_W - size) / 2, 320, size, size);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "/icon-512.svg";
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 96px system-ui, sans-serif";
  ctx.fillText("I'm on the", STORY_W / 2, 740);
  ctx.fillText("Ahavah waitlist.", STORY_W / 2, 850);

  if (position) {
    ctx.fillStyle = "#d7ff81";
    ctx.font = "800 150px system-ui, sans-serif";
    ctx.fillText(`#${position.toLocaleString()}`, STORY_W / 2, 1110);
  }

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "500 48px system-ui, sans-serif";
  ctx.fillText("Torah-observant matchmaking", STORY_W / 2, 1320);
  ctx.fillText("for serious believers.", STORY_W / 2, 1384);

  ctx.fillStyle = "#d7ff81";
  ctx.font = "700 56px system-ui, sans-serif";
  ctx.fillText("ahavah.app", STORY_W / 2, 1660);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function WaitlistShareCard({ position }: { position: number | null }) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    setMounted(true);
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const handleSave = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const blob = await drawStory(position);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ahavah-waitlist.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      busy.current = false;
    }
  }, [position]);

  const handleShare = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const blob = await drawStory(position);
      const file = blob
        ? new File([blob], "ahavah-waitlist.png", { type: "image/png" })
        : null;
      const nav = navigator as Navigator & {
        canShare?: (d?: ShareData) => boolean;
      };
      if (file && nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Ahavah", text: CAPTION, url: SHARE_URL });
      } else if (navigator.share) {
        await navigator.share({ title: "Ahavah", text: CAPTION, url: SHARE_URL });
      }
    } catch {
      /* user cancelled / unsupported */
    } finally {
      busy.current = false;
    }
  }, [position]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CAPTION);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }, []);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5">
      {/* On-screen preview (brand fonts) */}
      <Card
        tone="elevated"
        className="relative w-full max-w-[260px] aspect-[9/16] items-center justify-center gap-5 rounded-[28px] p-7 text-center text-white ring-1 ring-white/10"
        style={{ background: "linear-gradient(155deg, #1a1340, #3b2f7a)" }}
      >
        <LogoMark size={56} decorative />
        <div
          style={{ fontFamily: "var(--font-display)", fontSize: "28px", lineHeight: 1.05 }}
        >
          I&apos;m on the Ahavah waitlist.
        </div>
        {position ? (
          <div className="text-lime" style={{ fontFamily: "var(--font-display)", fontSize: "44px" }}>
            #{position.toLocaleString()}
          </div>
        ) : null}
        <div className="text-[13px] text-white/80">Torah-observant matchmaking for serious believers.</div>
        <div className="text-[13px] font-bold text-lime">ahavah.app</div>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Button variant="outline" size="tap" onClick={handleSave}>
          <Download className="size-4" />
          Save image
        </Button>
        {mounted && canNativeShare ? (
          <Button variant="outline" size="tap" onClick={handleShare}>
            <Share2 className="size-4" />
            Share
          </Button>
        ) : null}
        <Button variant="outline" size="tap" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy caption"}
        </Button>
      </div>

      <p className="text-meta text-(--ink-3)">Post it to your story and tag @ahavah.</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify LogoMark + Button props.** Confirm `LogoMark` accepts `size` + `decorative` (it does — used in `waitlist/page.tsx` line 299) and `Button` supports `variant="outline"` + `size="tap"` (used in `waitlist/page.tsx` line 327). If `size="tap"` is unavailable, fall back to the default size (drop the `size` prop). No code change expected.

- [ ] **Step 3: Wire the count + card into the completion screen.** In `src/app/waitlist/page.tsx`:

Add imports:
```tsx
import { getWaitlistCount } from "@/lib/waitlist";
import { WaitlistShareCard } from "@/components/app/waitlist-share-card";
```

Add state beside the others (~line 76):
```tsx
const [position, setPosition] = useState<number | null>(null);
```

In `handleNext`, after `setDone(true);` (inside the success branch, after `postWaitlist` resolves and the draft is cleared), fetch the count:
```tsx
      setDone(true);
      getWaitlistCount()
        .then((r) => setPosition(r.count))
        .catch(() => {
          /* position is decorative; leave null */
        });
```

In the `if (done)` completion block, after the email confirmation paragraph (`<motion.div {...fadeUp} ... className="flex max-w-md flex-col gap-4">...</motion.div>`, ~lines 303-316) and before the "Welcome to Ahavah." line, insert the share card:
```tsx
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.25 }}>
          <WaitlistShareCard position={position} />
        </motion.div>
```

- [ ] **Step 4: Typecheck + build.**

Run: `npx tsc --noEmit && npx next build`
Expected: no errors; "Compiled successfully" (watch for any `/waitlist` prerender/Suspense regression — the page already wraps the flow in `<Suspense>`, so it should pass).

- [ ] **Step 5: Manual check (after deploy in Task 8).** On `/waitlist`, complete the flow: the completion screen shows the preview card with `#N`, "Save image" downloads a PNG, "Copy caption" confirms "Copied", and "Share" appears only on share-capable browsers.

- [ ] **Step 6: Commit.**

```bash
git add src/components/app/waitlist-share-card.tsx src/app/waitlist/page.tsx
git commit -m "feat(waitlist): Instagram share card (canvas image + save/share/copy) on completion"
```

---

### Task 5: Frontend — "Who it's for" positioning band

**Files:**
- Modify: `src/app/page.tsx` (insert a new `<section>` after the hero `#waitlist` section, before `#features`; add a small `WhoItsFor` component near the other landing helper components)

Uses provided taglines verbatim. Built from `SectionHead` + kit `Card` + `Pill` (already imported in `page.tsx`).

- [ ] **Step 1: Insert the section.** Immediately after the closing `</section>` of the hero (`id="waitlist"`) and before `{/* ═══ FEATURES ═══ */}`, add:

```tsx
        {/* ═══════════════════════ WHO IT'S FOR ═══════════════════════ */}
        <section id="who" className="px-4 sm:px-6 md:px-8 py-20 lg:py-30">
          <div className="mx-auto max-w-[480px] lg:max-w-[900px]">
            <SectionHead
              overline="Who it's for"
              title="Built for believers who take it seriously."
              body="Ahavah is a set-apart space for people seriously seeking marriage. We're here to grow legacy, build covenant love, raise families in the truth, and strengthen Torah-based communities and family structures. Not a numbers game. A remnant."
            />

            <div className="flex flex-wrap justify-center gap-2.5">
              {[
                "Torah-observant dating for serious believers",
                "Built for Messianic Torah-observant singles",
                "Not mainstream Christian dating. Not secular dating.",
                "Aligned in Torah, faith, family, and covenant values",
                "For believers who take Torah, marriage, and family seriously",
              ].map((line) => (
                <Pill key={line} variant="lavender" className="px-4 py-2 text-[13px]">
                  {line}
                </Pill>
              ))}
            </div>

            <p className="mt-8 text-center text-[14px] text-(--ink-3)">
              Modesty matters here, in conduct and in photos.{" "}
              <Link href="/legal/community-guidelines" prefetch={false} className="font-semibold text-(--color-lavender) underline-offset-2 hover:underline">
                See our guidelines
              </Link>
              .
            </p>
          </div>
        </section>
```

- [ ] **Step 2: Confirm `Pill variant="lavender"` exists.** It is used in the hero (`<Pill variant="lavender">Pre-launch</Pill>`, line 169), so it is valid. `Link` is already imported. No new imports.

- [ ] **Step 3: Typecheck + build.**

Run: `npx tsc --noEmit && npx next build`
Expected: no errors.

- [ ] **Step 4: Commit.**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): add 'Who it's for' Torah-observant positioning band"
```

---

### Task 6: Frontend — privacy & verification trust block

**Files:**
- Modify: `src/app/page.tsx` (inside the `#verified` section, after the tiers grid)

Adds a privacy-principles block under the verification tiers. Uses kit `Card` + `IconBadge` (both already imported). Icons `ShieldCheck`, `Lock`, `EyeOff` — `ShieldCheck` is already imported; add `Lock` and `EyeOff` to the lucide import.

- [ ] **Step 1: Add icons.** In the `lucide-react` import block in `src/app/page.tsx`, add `EyeOff,` and `Lock,` (alphabetical-ish; placement is cosmetic):

```ts
  IdCard,
  Languages,
  Lock,
  MapPin,
```
and
```ts
  Globe,
  Heart,
  EyeOff,
```
(Place each within the existing single `import { ... } from "lucide-react";` block. Final block must contain `EyeOff` and `Lock` exactly once.)

- [ ] **Step 2: Insert the block.** Find the `#verified` section. After the tiers grid (the `<div className="grid grid-cols-1 md:grid-cols-3 ...">...</div>` that maps bronze/silver/gold) and before that section's closing `</div></section>`, insert:

```tsx
            {/* Privacy principles — verification done responsibly */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-6">
              {[
                {
                  Icon: ShieldCheck,
                  title: "Verification is for safety",
                  body: "We confirm real people to keep predators and catfish out. Not surveillance. Not data harvesting.",
                },
                {
                  Icon: Lock,
                  title: "Minimal data retention",
                  body: "ID and selfie checks are processed, not stockpiled. Your government ID stays with our verification provider (Stripe Identity). We keep only the pass or fail result.",
                },
                {
                  Icon: EyeOff,
                  title: "Never public",
                  body: "Your verification photos and ID are never shown to other users and never posted anywhere. Sensitive data is not exposed.",
                },
              ].map(({ Icon, title, body }) => (
                <Card key={title} tone="elevated" className="p-6 lg:p-7 gap-3 items-start rounded-[22px] lg:rounded-[28px]">
                  <IconBadge tone="brand" size="lg" shape="square">
                    <Icon size={20} />
                  </IconBadge>
                  <h3 className="text-[16px] lg:text-[17px] font-bold text-(--ink) tracking-tight">{title}</h3>
                  <p className="text-sm leading-[1.55] text-(--ink-2)">{body}</p>
                </Card>
              ))}
            </div>
```

- [ ] **Step 3: Confirm `IconBadge` props.** `IconBadge` is used in `page.tsx` as `<IconBadge tone={...} size="xl" shape="square">`; `size="lg"` is a valid size in the same scale. If `lg` is rejected by the type, use `size="xl"`. Verify against `src/components/ui/icon-badge.tsx` before committing.

- [ ] **Step 4: Typecheck + build.**

Run: `npx tsc --noEmit && npx next build`
Expected: no errors.

- [ ] **Step 5: Commit.**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): add privacy/verification trust principles to #verified"
```

---

### Task 7: Frontend — modesty guidance copy

**Files:**
- Modify: `src/app/onboarding/photos/page.tsx`
- Modify: `src/app/legal/community-guidelines/page.tsx`

- [ ] **Step 1: Photos screen guideline.** In `src/app/onboarding/photos/page.tsx`, the bottom note paragraph (~lines 252-255) currently reads "JPEG, PNG, or WebP...". Add a modesty block immediately before it (after the `aria-live` count `<p>` at ~line 247-251):

```tsx
      <div className="mt-4 rounded-2xl bg-(--card) p-4 ring-1 ring-(--hairline)">
        <p className="text-caption font-semibold text-(--ink)">Photo guidelines</p>
        <p className="mt-1 text-caption leading-[1.55] text-(--ink-2)">
          Dress modestly. No cleavage, no revealing or tight clothing, and nothing
          suggestive. Stay fully covered, no exposed midriff. Your face must be
          clearly visible, and your main photo should be of you alone.
        </p>
      </div>
```

- [ ] **Step 2: Typecheck.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Community guidelines "Be modest" section.** In `src/app/legal/community-guidelines/page.tsx`:

Add a TOC entry — insert into the `toc={[...]}` array after the "Be real" entry:
```tsx
        { label: "Be modest",            icon: "heart",  slug: "be-modest" },
```

Add the matching section — insert into the `sections={[...]}` array after the "be-real" section object:
```tsx
        {
          slug: "be-modest",
          heading: "Be modest",
          body: "Dress and present yourself modestly, in line with Torah values. No revealing clothing, cleavage, or suggestive imagery. Photos that do not meet these standards will be removed.",
        },
```

(Note: `icon: "heart"` reuses an existing icon key. If `LegalArticleShell` supports a more fitting key such as "shield" or "lock", prefer it; "heart" is a safe known-valid value.)

- [ ] **Step 4: Build.**

Run: `npx next build`
Expected: no errors; "Compiled successfully".

- [ ] **Step 5: Commit.**

```bash
git add src/app/onboarding/photos/page.tsx src/app/legal/community-guidelines/page.tsx
git commit -m "feat(content): modesty guidance on photo screen + 'Be modest' community guideline"
```

---

### Task 8: Verify + deploy

- [ ] **Step 1: Backend deploy.** Push `ahavah/main`; watch the "Deploy ahavah/main → droplet" GHA run to success (it re-runs migrations idempotently + rebuilds api+chat).

```bash
git push origin main
```

- [ ] **Step 2: Backend smoke.** Confirm the public route on the droplet:

```bash
curl -s https://<api-host>/waitlist/count
```
Expected: `{"count": <int>}` (200).

- [ ] **Step 3: Web deploy.** Ensure all web commits are pushed:

```bash
git push origin master
```

- [ ] **Step 4: Verify Vercel.** Poll until the new production deployment is `Ready` (use the stored Vercel token; `npx vercel ls --token $TOKEN`). Do NOT claim live until Ready (the established lesson: `next build` passing locally is necessary but confirm Vercel Ready).

- [ ] **Step 5: Manual acceptance** on the live site:
  - Landing hero shows the live count when `>= 50` (else "Early / be among the first"); "Worldwide" + "100+ languages" stats; no "12,400"/"63".
  - "Who it's for" band renders all five taglines + the modesty line linking to guidelines.
  - `#verified` shows the three privacy principles.
  - `/waitlist` completion shows the share card with `#N`; Save/Copy work; Share shows only where supported.
  - `/onboarding/photos` shows the modesty guideline block; `/legal/community-guidelines` shows "Be modest".

- [ ] **Step 6: Tell the user** what shipped + the one residual decision (the "dating" wording is live verbatim; offer to soften if they change their mind).

---

## Self-Review

**Spec coverage:**
- Live count + floor → Task 1 (backend), Task 2 (hook/floor), Task 3 (hero). ✓
- Replace fabricated 12,400 → Task 3. ✓ (63 → "Worldwide" per confirmed default.)
- In-app IG share card (canvas, save/share/copy, caption, #N) → Task 4. ✓
- Landing inline-success share → **covered partially:** the spec mentioned a compact share button on the hero inline-form success. Decision: the primary share moment lives on `/waitlist` completion (Task 4); the hero inline form only collects email and does not run the full wizard, so a duplicate share affordance there adds surface for little gain. **Resolved in plan: omit the hero-inline share button (YAGNI); the hero CTA already routes serious sign-ups to `/waitlist`.** If the user wants it, it's a one-line `Button` linking to `/waitlist`.
- Positioning copy + taglines + modesty line → Task 5. ✓
- Modesty guidance (photos + community guidelines) → Task 7. ✓
- Privacy/verification trust messaging → Task 6. ✓

**Placeholder scan:** No "TBD"/"TODO" in code steps. The two "confirm prop value" notes (Task 4 Step 2, Task 6 Step 3) are verification guards with explicit fallbacks, not placeholders. All code blocks are complete.

**Type consistency:** `count(tx)` (Task 1) ↔ `getWaitlistCount(): {count:number}` (Task 2) ↔ `useWaitlistCount(): number|null` + `aboveFloor` (Task 2) ↔ consumed in Task 3 (hero) and Task 4 (`position`). `WaitlistShareCard({ position: number|null })` (Task 4 Step 1) matches the call site (Task 4 Step 3). Route path `/waitlist/count` identical across backend (Task 1) and client (Task 2). Consistent.

**Scope note:** Four workstreams, but they share the landing/waitlist surface and one voice, and each task is independently committable + testable, so one plan is appropriate (per the approved spec).
