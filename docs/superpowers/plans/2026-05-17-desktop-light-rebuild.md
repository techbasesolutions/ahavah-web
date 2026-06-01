# Desktop + Light-Mode Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the 14 desktop (md+) route layouts in `ahavah-web` faithfully against the canonical handoff package, on top of an audited primitive layer and a dual-mode (dark mobile / light desktop) token foundation — without regressing mobile dark mode.

**Architecture:** Light mode is an opt-in add-on to dark mode controlled by a user-facing toggle (kit `<Switch>` primitive only). ThemeProvider is rewritten to read a persisted preference (`localStorage["ahavah-theme"]`) with `"auto"` (current breakpoint behavior) as a third option; default is `"auto"` so existing behavior is preserved for users who never touch the toggle. The `.ahavah-app` desktop-release rule in `globals.css` is generalized so light theme works at any breakpoint, not just md+. We (1) wire the theme toggle and persistence, (2) audit the primitive layer in `src/components/ui/` against `design-system-v2.md` Layer 2 — rolling back off-spec variants (`tone="superBrand"`, `<AvatarFallback variant="blur">`) and aligning `Button` `circle*` sizes to spec; (2) add the missing pattern components (`SparkleTile`, `BlurredAvatar`); (3) run the contrast audit on the new light tokens; (4) rebuild each route's desktop block by porting the matching `desktop.jsx` function 1:1 with primitive substitutions, keeping the mobile `md:hidden` JSX intact and reusing existing hooks/state. Screenshot verification gate per screen.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, shadcn + Base UI (`src/components/ui/`), Kibo UI (`src/components/kibo-ui/`), Plus Jakarta Sans, Vitest, `pnpm`.

**Canonical handoff (authoritative source):** `D:/Antigravity/ahavah-api/Ahavah-Claude Design/handoff/` — in-repo working copy at `docs/handoff-desktop/`.

**Predecessor handoff (read first):** `docs/superpowers/handoffs/2026-05-17-desktop-light-rebuild-handoff.md` — encodes the failures this plan corrects. **Read sections 2, 3, 5, 6, 7, 8 before starting.**

---

## File Structure

### Files to MODIFY (theme toggle + foundation)
- `src/components/system/theme-provider.tsx` — rewrite to read/write `localStorage["ahavah-theme"]` (`"light" | "dark" | "auto"`), default `"auto"`; in `"auto"` mode keep current matchMedia behavior; in explicit modes ignore breakpoint
- `src/app/globals.css` — generalize `.ahavah-app` desktop-release rule so it triggers on `html[data-theme="light"]` at ANY breakpoint, not just `@media (min-width: 768px)`; keep dark-default rules untouched

### Files to CREATE (theme toggle)
- `src/components/app/theme-toggle.tsx` — kit-only toggle using existing `<Switch>` from `src/components/ui/switch.tsx`; exposes `<ThemeToggle showLabel?>` and reads/writes via a small `useTheme()` hook colocated in the same file
- `src/lib/theme.ts` — `useTheme()` hook + `getInitialTheme()` SSR-safe reader + `setTheme(mode)` localStorage writer + matchMedia subscription for `"auto"` mode

### Files to MODIFY (theme toggle placement)
- `src/components/app/desktop-sidebar.tsx` — add `<ThemeToggle showLabel />` to the bottom user block (above the user avatar row)
- `src/app/settings/page.tsx` — add a "Theme" row in the mobile settings list with `<ThemeToggle />` on the right

### Files to MODIFY (primitive layer)
- `src/components/ui/button.tsx` — remove `tone="superBrand"`; rename sizes `circle → circle-lg`, `circle-lg → circle-xl`, `circle-xl → circle-2xl`; keep existing `nativeButton` auto-handling
- `src/components/ui/avatar.tsx` — remove `<AvatarFallback variant="blur">`; ensure `name-gradient`, `ring="lime"`, `online` variants present per spec
- `src/components/kibo-ui/pill.tsx` — add `lavOutline` variant; verify `lime`/`lavender`/`pink`/`success`/`glassDark` present
- `src/components/ui/card.tsx` — add `gradient`, `overlap`, `tier-active` variants per spec §Card
- `src/components/ui/input.tsx` — add `elevated` variant + `sm`/`md`/`lg` sizes + error state if missing

### Files to CREATE (pattern layer)
- `src/components/app/sparkle-tile.tsx` — indigo rounded-square + sparkle lockup (DS spec §Sparkle)
- `src/components/app/blurred-avatar.tsx` — paywall silhouette (lavender + Lock icon)

### Files to MODIFY (route desktop blocks — one task each, mobile `md:hidden` block untouched)
- `src/app/profile/[uuid]/page.tsx` (worst offender — rebuild first)
- `src/app/discover/page.tsx`
- `src/app/matches/page.tsx`
- `src/app/inbox/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/map/page.tsx`
- `src/app/paywall/page.tsx`
- `src/app/verify/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/locked/page.tsx`
- `src/app/match/page.tsx`
- `src/app/onboarding/page.tsx` + 14 subroute pages (`name`, `gender`, `looking-for`, `country`, `relocation`, `languages`, `polygyny`, `assembly`, `religion-level`, `kashrut`, `shabbat`, `kids`, `interests`, `photos`)
- `src/app/auth/sign-up/page.tsx`, `src/app/auth/sign-in/page.tsx`
- `src/app/page.tsx`

### Files NOT to touch (foundation; already correct)
- `src/app/globals.css` — light tokens + `.ahavah-app` desktop release
- `src/app/layout.tsx` — ThemeProvider wrapping
- `src/components/system/theme-provider.tsx`
- `src/components/app/page-shell.tsx`, `src/components/app/bottom-nav.tsx`, `src/components/app/desktop-sidebar.tsx`, `src/components/app/desktop-topbar.tsx`, `src/components/app/brand-mark.tsx`
- `src/lib/use-redirect-if-signed-in.ts` — hydration fix

---

## Phase 0 — Preflight

### Task 0: Sync canonical handoff and read all source docs

**Files:**
- Sync: `docs/handoff-desktop/` (from `D:/Antigravity/ahavah-api/Ahavah-Claude Design/handoff/`)
- Read-only: `docs/handoff-desktop/{README.md, design-system-v2.md, ds.jsx, desktop.jsx, desktop-screens.html}`
- Read-only: `CLAUDE.md`, `AGENTS.md`, `docs/BUILD-PLAN.md`, `PROJECT-STATUS.md`, `docs/superpowers/handoffs/2026-05-17-desktop-light-rebuild-handoff.md`

- [ ] **Step 1: Re-sync the in-repo handoff copy from the authoritative location**

```powershell
Remove-Item -Recurse -Force d:/Antigravity/ahavah-web/docs/handoff-desktop
Copy-Item -Recurse "D:/Antigravity/ahavah-api/Ahavah-Claude Design/handoff" d:/Antigravity/ahavah-web/docs/handoff-desktop
```

- [ ] **Step 2: Read these files end-to-end in order (no skim)**

  1. `docs/handoff-desktop/README.md` — non-negotiables (lime/lavender/pink pair with text-black only; Plus Jakarta Sans; canonical sparkle SVG; ≥44px tap targets even on desktop)
  2. `docs/handoff-desktop/design-system-v2.md` — **all three Layers**: Foundation, Components, Patterns
  3. `docs/handoff-desktop/ds.jsx` — kit primitives the handoff uses
  4. `docs/handoff-desktop/desktop.jsx` — skim function list and line indices, do not read line-by-line yet
  5. `CLAUDE.md`, `AGENTS.md`, `docs/BUILD-PLAN.md`, `PROJECT-STATUS.md` — project rules

- [ ] **Step 3: Open `docs/handoff-desktop/desktop-screens.html` at 1440×900 and screenshot each of the 14 frames**

Save screenshots to `docs/screenshots/handoff-target/01-welcome.png` … `14-locked.png`. These are your target references for each screen-rebuild verification gate.

- [ ] **Step 4: Verify baseline tests + typecheck before any edit**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx vitest run
```
Expected: tsc clean. Vitest shows **20 baseline failures** across `tests/lib/{auth-otp,chat-stanza,photo-storage,profile-completeness,profile-schema}.test.ts`. Record exact count. Any new failure introduced later in this plan must be investigated before proceeding.

- [ ] **Step 5: Confirm dev server runs and `data-theme` flips at md break**

```bash
npm run dev
```
Open `http://localhost:3000` at 1440×900. In DevTools Elements: confirm `<html data-theme="light">`. Resize to 414×900: confirm `<html data-theme="dark">` and `.ahavah-app` re-applies its 414px indigo column. **DO NOT commit anything in this phase.**

---

### Task 0a: Theme toggle + manual theme control (kit primitives only)

**Files:**
- Create: `src/lib/theme.ts`
- Create: `src/components/app/theme-toggle.tsx`
- Modify: `src/components/system/theme-provider.tsx`
- Modify: `src/app/globals.css` (only the `.ahavah-app` desktop-release media query — generalize scope)
- Modify: `src/components/app/desktop-sidebar.tsx` (add toggle to bottom user block)
- Modify: `src/app/settings/page.tsx` (add Theme row to mobile settings)
- Test: `tests/lib/theme.test.ts`, `tests/components/theme-toggle.test.tsx`

**Constraint:** kit primitives only. Use the existing `<Switch>` from `src/components/ui/switch.tsx`. Do NOT roll a custom toggle button.

- [ ] **Step 1: Write the failing test for `useTheme()` hook semantics**

Create `tests/lib/theme.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react"
import { useTheme, setTheme, getInitialTheme } from "@/lib/theme"

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute("data-theme")
})

describe("theme", () => {
  it("getInitialTheme defaults to 'auto' when nothing is stored", () => {
    expect(getInitialTheme()).toBe("auto")
  })

  it("getInitialTheme reads a persisted value", () => {
    localStorage.setItem("ahavah-theme", "light")
    expect(getInitialTheme()).toBe("light")
  })

  it("setTheme('light') writes data-theme=light on <html> and persists", () => {
    setTheme("light")
    expect(document.documentElement.dataset.theme).toBe("light")
    expect(localStorage.getItem("ahavah-theme")).toBe("light")
  })

  it("setTheme('dark') writes data-theme=dark on <html> and persists", () => {
    setTheme("dark")
    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(localStorage.getItem("ahavah-theme")).toBe("dark")
  })

  it("setTheme('auto') resolves to dark below md and light at md+", () => {
    // jsdom default is 1024 wide -> matches min-width: 768px -> light
    setTheme("auto")
    expect(document.documentElement.dataset.theme).toBe("light")
    expect(localStorage.getItem("ahavah-theme")).toBe("auto")
  })

  it("useTheme reflects setTheme updates", () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setMode("dark"))
    expect(result.current.mode).toBe("dark")
    expect(document.documentElement.dataset.theme).toBe("dark")
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npx vitest run tests/lib/theme.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/theme'`.

- [ ] **Step 3: Implement `src/lib/theme.ts`**

```ts
"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

export type ThemeMode = "light" | "dark" | "auto"

const STORAGE_KEY = "ahavah-theme"
const MQ = "(min-width: 768px)"

function resolveAuto(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia(MQ).matches ? "light" : "dark"
}

function apply(mode: ThemeMode) {
  if (typeof document === "undefined") return
  const resolved = mode === "auto" ? resolveAuto() : mode
  document.documentElement.dataset.theme = resolved
}

export function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "auto"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark" || stored === "auto") return stored
  return "auto"
}

export function setTheme(mode: ThemeMode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, mode)
    window.dispatchEvent(new CustomEvent("ahavah-theme-change", { detail: mode }))
  }
  apply(mode)
}

const listeners = new Set<() => void>()
function subscribe(cb: () => void) {
  listeners.add(cb)
  const onStorage = () => cb()
  const onCustom = () => cb()
  window.addEventListener("storage", onStorage)
  window.addEventListener("ahavah-theme-change", onCustom)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("ahavah-theme-change", onCustom)
  }
}

export function useTheme() {
  const mode = useSyncExternalStore(
    subscribe,
    () => getInitialTheme(),
    () => "auto" as ThemeMode
  )
  return {
    mode,
    setMode: (m: ThemeMode) => setTheme(m),
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run tests/lib/theme.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 5: Rewrite `src/components/system/theme-provider.tsx`**

```tsx
"use client"

import { useEffect } from "react"
import { getInitialTheme, setTheme } from "@/lib/theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mode = getInitialTheme()
    setTheme(mode)
    if (mode === "auto") {
      const mql = window.matchMedia("(min-width: 768px)")
      const onChange = () => setTheme("auto")
      mql.addEventListener("change", onChange)
      const onCustom = (e: Event) => {
        const next = (e as CustomEvent<string>).detail
        if (next !== "auto") mql.removeEventListener("change", onChange)
      }
      window.addEventListener("ahavah-theme-change", onCustom)
      return () => {
        mql.removeEventListener("change", onChange)
        window.removeEventListener("ahavah-theme-change", onCustom)
      }
    }
  }, [])
  return <>{children}</>
}
```

- [ ] **Step 6: Write the failing test for `<ThemeToggle>`**

Create `tests/components/theme-toggle.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { ThemeToggle } from "@/components/app/theme-toggle"

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute("data-theme")
})

describe("ThemeToggle", () => {
  it("renders a kit Switch with an accessible label", () => {
    render(<ThemeToggle showLabel />)
    expect(screen.getByRole("switch", { name: /theme/i })).toBeInTheDocument()
  })

  it("toggling sets data-theme between light and dark and persists", () => {
    render(<ThemeToggle />)
    const sw = screen.getByRole("switch")
    fireEvent.click(sw)
    const after = document.documentElement.dataset.theme
    expect(after === "light" || after === "dark").toBe(true)
    expect(["light", "dark"]).toContain(localStorage.getItem("ahavah-theme"))
  })
})
```

- [ ] **Step 7: Run, verify fail**

```bash
npx vitest run tests/components/theme-toggle.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `src/components/app/theme-toggle.tsx` (KIT PRIMITIVES ONLY)**

```tsx
"use client"

import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/lib/theme"

type Props = {
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({ showLabel, className }: Props) {
  const { mode, setMode } = useTheme()
  const resolved =
    mode === "auto"
      ? typeof window !== "undefined" &&
        window.matchMedia("(min-width: 768px)").matches
        ? "light"
        : "dark"
      : mode
  const isLight = resolved === "light"

  return (
    <label className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}>
      {showLabel && (
        <span className="text-sm text-[color:var(--ink-2)]">Theme</span>
      )}
      <Switch
        aria-label="Theme"
        checked={isLight}
        onCheckedChange={(next) => setMode(next ? "light" : "dark")}
      />
    </label>
  )
}
```

- [ ] **Step 9: Run test, verify pass**

```bash
npx vitest run tests/components/theme-toggle.test.tsx
```
Expected: PASS (2 tests).

- [ ] **Step 10: Generalize `.ahavah-app` desktop release in `globals.css`**

In `src/app/globals.css` around line 336–344, locate the rule:

```css
@media (min-width: 768px) {
  html[data-theme="light"] .ahavah-app { … }
}
```

Replace with:

```css
html[data-theme="light"] .ahavah-app {
  max-width: none;
  background-color: transparent;
  overflow-x: visible;
  min-height: 100dvh;
}
```

(Drop the `@media` wrap so light theme releases the 414px indigo column at any breakpoint — required so the toggle works on mobile.) Keep the unconditional dark `.ahavah-app` rule at ~line 321 unchanged so dark mode on any breakpoint keeps its column.

- [ ] **Step 11: Place the toggle**

In `src/components/app/desktop-sidebar.tsx`, find the bottom user block and add `<ThemeToggle showLabel />` immediately above (or beside) the user-avatar row. Add the import.

In `src/app/settings/page.tsx`, add a settings row above the existing list:

```tsx
<div className="flex items-center justify-between py-3">
  <span className="text-base font-medium">Theme</span>
  <ThemeToggle />
</div>
```

(Apply the same row inside the desktop `hidden md:…` block too — both shells expose it.)

- [ ] **Step 12: Manual verification at three breakpoints**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: tsc clean. Vitest: 20 baseline + new greens (theme + theme-toggle). No new failures.

Open `http://localhost:3000` and confirm:
1. At 1440×900, default state shows light theme (auto mode resolves to light at md+).
2. Click the toggle in the sidebar — page flips to dark with the 414px column NOT re-applied (column release is now unconditional under light, and dark on desktop just paints dark surfaces over the released layout).
3. Resize to 414×900 — light/dark choice persists.
4. Reload — preference survives.

- [ ] **Step 13: Mark Task 0a complete. Do not commit.**

---

## Phase 1 — Primitive audit & rollback

### Task 1: Roll back `tone="superBrand"` from Button; migrate callers to `tone="brand"`

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/app/discover/page.tsx:498`, `:553`, `:582` (only known callers per handoff recon)

- [ ] **Step 1: Grep every `superBrand` reference**

```bash
grep -rn 'superBrand' src/
```
Expected hits: 3 in `src/app/discover/page.tsx` plus 1 in `src/components/ui/button.tsx`. If more appear, migrate each.

- [ ] **Step 2: In `src/components/ui/button.tsx`, delete the `superBrand:` entry from the `tone:` block of the cva**

The cva starts at `src/components/ui/button.tsx:14`. Within `tone: { … }` (around line 43), remove the `superBrand: "…"` line entirely. No other change.

- [ ] **Step 3: In `src/app/discover/page.tsx`, replace each `tone="superBrand"` with `tone="brand"`**

Replace `tone="superBrand"` → `tone="brand"` at every call site (use Edit's `replace_all` on that file). Also clean up the two `// …superBrand…` comments at lines 498 and 553 so they reference `tone="brand"` instead.

- [ ] **Step 4: Verify no stray references**

```bash
grep -rn 'superBrand' src/
```
Expected: no matches.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 6: Visual check** — open `/discover` at 1440×900. The Super button should still render (lavender + black) and click without error. Take a screenshot to `docs/screenshots/audit/discover-super-button.png` for the record.

- [ ] **Step 7: Commit-staging marker only — do NOT `git commit`. Per handoff §10 rule 10, no commits until user OK.**

---

### Task 2: Rename Button circle sizes to match spec (`circle` → `circle-lg`, `circle-lg` → `circle-xl`, `circle-xl` → `circle-2xl`)

**Files:**
- Modify: `src/components/ui/button.tsx` (cva `size:` block, around line 83)
- Modify (callers, full list from grep): `src/app/discover/page.tsx`, `src/app/inbox/page.tsx`, `src/app/map/page.tsx`, `src/app/match/page.tsx`, `src/app/onboarding/country/page.tsx`, `src/app/profile/edit/page.tsx`, `src/app/profile/[uuid]/page.tsx`, `src/app/settings/account/page.tsx`, `src/app/verify/bronze/page.tsx`, `src/app/verify/silver/page.tsx`, `src/components/app/back-button.tsx`, `src/components/app/chat-input.tsx`, `src/components/app/swipe-deck.tsx`

The rename must be done in reverse order to avoid collision (rename `circle-xl` first, then `circle-lg`, then `circle`).

- [ ] **Step 1: Inventory existing callers**

```bash
grep -rn 'size="circle' src/
```
Record the list. Expected ~25 hits.

- [ ] **Step 2: In `src/components/ui/button.tsx` size cva block, rename keys in this order**

`circle-xl` → `circle-2xl`, then `circle-lg` → `circle-xl`, then `circle` → `circle-lg`. The CSS values (48 / 56 / 64) stay attached to the same physical size — the key labels move up one slot to match spec §Button.

- [ ] **Step 3: In every caller file, perform the same reverse-order rename**

For each file from Step 1, apply Edit with `replace_all` in this order:
1. `size="circle-xl"` → `size="circle-2xl"`
2. `size="circle-lg"` → `size="circle-xl"`
3. `size="circle"` → `size="circle-lg"`

Do all three replacements on a single file before moving to the next file, so no transient state has two callers naming the same key for different sizes.

- [ ] **Step 4: Verify no `size="circle"` (bare) remains**

```bash
grep -rn 'size="circle"' src/
```
Expected: no matches. (Only `circle-lg`, `circle-xl`, `circle-2xl` should remain.)

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 6: Visual check** — open `/discover`, `/match`, `/profile/[uuid]`, `/inbox` at 1440×900. Action buttons render at the right sizes (48 / 56 / 64). No layout regression.

---

### Task 3: Roll back `<AvatarFallback variant="blur">`; build `<BlurredAvatar>` paywall component

**Files:**
- Modify: `src/components/ui/avatar.tsx` (remove `variant="blur"` from `avatarFallbackVariants` cva at line 36)
- Create: `src/components/app/blurred-avatar.tsx`
- Modify: `src/app/discover/page.tsx:804` (only known call site, the "New likes" card)

- [ ] **Step 1: Write the failing test**

Create `tests/components/blurred-avatar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { BlurredAvatar } from "@/components/app/blurred-avatar"

describe("BlurredAvatar", () => {
  it("renders a lavender frosted silhouette with a Lock icon", () => {
    render(<BlurredAvatar aria-label="Hidden like" />)
    const el = screen.getByLabelText("Hidden like")
    expect(el).toBeInTheDocument()
    expect(el.querySelector("svg")).toBeInTheDocument() // Lock icon
  })

  it("accepts size variants", () => {
    const { rerender } = render(<BlurredAvatar size="md" aria-label="x" />)
    rerender(<BlurredAvatar size="lg" aria-label="x" />)
    expect(screen.getByLabelText("x")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test, verify failure**

```bash
npx vitest run tests/components/blurred-avatar.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/app/blurred-avatar'`.

- [ ] **Step 3: Implement `<BlurredAvatar>`**

Create `src/components/app/blurred-avatar.tsx`:

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

const blurredAvatarVariants = cva(
  "inline-flex items-center justify-center rounded-full bg-[color:var(--color-lavender)]/40 backdrop-blur-sm text-[color:var(--ink)] ring-1 ring-[color:var(--hairline)]",
  {
    variants: {
      size: {
        sm: "h-10 w-10",
        md: "h-12 w-12",
        lg: "h-16 w-16",
        xl: "h-20 w-20",
      },
    },
    defaultVariants: { size: "md" },
  }
)

type Props = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof blurredAvatarVariants>

export function BlurredAvatar({ size, className, ...rest }: Props) {
  return (
    <span className={cn(blurredAvatarVariants({ size }), className)} {...rest}>
      <Lock aria-hidden className="h-4 w-4" />
    </span>
  )
}
```

- [ ] **Step 4: Run the test, verify pass**

```bash
npx vitest run tests/components/blurred-avatar.test.tsx
```
Expected: PASS (2 tests).

- [ ] **Step 5: Migrate the `/discover` "New likes" call site**

In `src/app/discover/page.tsx` around line 804, replace:

```tsx
<AvatarFallback variant="blur">
```

with a `<BlurredAvatar size="md" />` (drop the surrounding `<Avatar>…<AvatarFallback>` if it's only there to host the blur fallback; otherwise keep `<Avatar>` and replace just the fallback contents with `<BlurredAvatar />`). Add the import: `import { BlurredAvatar } from "@/components/app/blurred-avatar"`. Update the nearby comment at line 781 to reference `<BlurredAvatar>` instead of `Avatar variant="blur"`.

- [ ] **Step 6: Remove the `blur` variant from `avatarFallbackVariants`**

In `src/components/ui/avatar.tsx` at the cva block starting line 36, delete the `blur: "…"` entry from `variant: { … }`. Keep `default`, `brand-fallback`, `photo`, `name-gradient` (add any of those that the spec requires but is missing).

- [ ] **Step 7: Verify no stray `variant="blur"` callers**

```bash
grep -rn 'variant="blur"' src/
```
Expected: no matches.

- [ ] **Step 8: Typecheck + full vitest**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: tsc clean. Vitest: 20 baseline failures + the 2 new `BlurredAvatar` passes counted in the green column. No new failures.

- [ ] **Step 9: Visual check** — open `/discover` and confirm the "New likes" card silhouettes render lavender-frosted with a Lock glyph, not as the previous blur avatar.

---

### Task 4: Audit `<Avatar>` for spec variants `name-gradient`, `ring="lime"`, `online`

**Files:**
- Modify: `src/components/ui/avatar.tsx`

- [ ] **Step 1: Diff existing cva against `design-system-v2.md §Avatar`**

Read `docs/handoff-desktop/design-system-v2.md` Layer 2 Avatar section in full. List which spec variants/props are NOT currently exposed.

- [ ] **Step 2: Add missing variants via cva extension**

For each missing spec entry: add it to the matching cva block in `avatar.tsx` and to `avatarFallbackVariants` if the variant affects fallback rendering. Mirror the styling rules from the spec verbatim (color values, ring width 2.5px lime, online-dot 12px lime bottom-right with 2.5px bg ring).

Concrete additions expected:
- `ring: { none, lime }` on `avatarVariants` (line 17) — `lime` adds `ring-[2.5px] ring-[color:var(--color-lime)]`.
- `online?: boolean` prop on the Avatar component — when true, renders an absolutely-positioned 12px lime dot in the bottom-right corner with a 2.5px ring in `--app`.
- `variant="name-gradient"` on `avatarFallbackVariants` — deterministic gradient generated from the name initials; use a stable hash of the first character to pick from a 6-stop palette declared at the top of the file.

- [ ] **Step 3: Write a unit test for the gradient deterministic-ness**

Append to `tests/components/avatar.test.tsx` (create if missing):

```tsx
import { render } from "@testing-library/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

it("name-gradient fallback is deterministic for the same initial", () => {
  const a = render(<AvatarFallback variant="name-gradient">A</AvatarFallback>)
  const b = render(<AvatarFallback variant="name-gradient">A</AvatarFallback>)
  expect(a.container.firstChild?.className).toBe(b.container.firstChild?.className)
})
```

- [ ] **Step 4: Run test + typecheck**

```bash
npx vitest run tests/components/avatar.test.tsx
npx tsc --noEmit
```
Expected: PASS + clean.

---

### Task 5: Audit `<Pill>` and add missing `lavOutline` variant

**Files:**
- Modify: `src/components/kibo-ui/pill.tsx`

- [ ] **Step 1: Open `docs/handoff-desktop/design-system-v2.md` §Pill and list expected variants**

Expected: `lime`, `lavender`, `pink`, `success`, `lavOutline`, `glassDark`.

- [ ] **Step 2: Diff against `src/components/kibo-ui/pill.tsx`'s current cva**

Grep current variant keys. For any spec variant missing, add it via cva. For `lavOutline`: `bg-transparent border border-[color:var(--color-lavender)] text-[color:var(--color-lavender)]`. For `glassDark`: per spec — translucent dark fill for overlay-on-photo usage.

- [ ] **Step 3: Add the new variant(s) and typecheck**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Quick visual smoke** — temporarily render each pill variant on a scratch page or in a Storybook-style file; confirm they look like the corresponding artboards in `light-system.html`. (No commit; this is exploratory.)

---

### Task 6: Audit `<Card>` and add missing variants `gradient`, `overlap`, `tier-active`

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: Open `docs/handoff-desktop/design-system-v2.md` §Card**

Expected variants per spec: `default`, `elevated`, `gradient` (Persian-Indigo → Lavender, white text, no border), `overlap` (negative-margin onto photo bottom edge, top radius-3xl, inverse shadow), `tier-active` (`inset 0 0 0 1.5px var(--color-{tier})`).

- [ ] **Step 2: Diff against current cva in `src/components/ui/card.tsx`**

Add missing variants as cva entries. `gradient` example:

```tsx
gradient:
  "bg-[linear-gradient(135deg,var(--color-persian-indigo)_0%,var(--color-lavender)_100%)] text-white border-0",
```

`tier-active` needs a `tier?: "bronze" | "silver" | "gold"` prop or accept a `--tier` CSS var the caller sets. Pick the cva-prop route for type-safety.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```
Expected: clean.

---

### Task 7: Audit `<Input>` for spec sizes + `elevated` + error state

**Files:**
- Modify: `src/components/ui/input.tsx`

- [ ] **Step 1: Open `docs/handoff-desktop/design-system-v2.md` §Input**

Expected: `tone="default"` (`bg-card`) + `tone="elevated"` (`bg-app`). Sizes `sm` 40h, `md` 48h, `lg` 56h. Error state: `1.5px` solid pink border + helper text slot.

- [ ] **Step 2: Diff against `src/components/ui/input.tsx`; add missing variants/sizes via cva**

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```
Expected: clean.

---

### Task 8: Phase 1 verification gate

- [ ] **Step 1: Full typecheck + vitest**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: tsc clean. Vitest: 20 baseline failures + new green tests from Tasks 3 and 4 (`BlurredAvatar`, Avatar gradient determinism). No new failures.

- [ ] **Step 2: Grep for any remaining off-spec variants**

```bash
grep -rn 'superBrand\|variant="blur"' src/
grep -rn 'size="circle"' src/
```
Expected: no matches for any of the three patterns.

- [ ] **Step 3: Note in handoff §9 status table that Phase 1 is complete (do not modify the route status rows yet).**

---

## Phase 2 — Pattern components

### Task 9: Build `<SparkleTile>` (indigo rounded-square + brand sparkle)

**Files:**
- Create: `src/components/app/sparkle-tile.tsx`
- Test: `tests/components/sparkle-tile.test.tsx`
- Migrate callers: `src/components/app/desktop-sidebar.tsx` (replaces the inlined indigo-square + `<BrandMark/>`), `src/app/page.tsx` welcome brand slot if applicable

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react"
import { SparkleTile } from "@/components/app/sparkle-tile"

describe("SparkleTile", () => {
  it("renders an indigo square with a sparkle svg inside", () => {
    render(<SparkleTile aria-label="Ahavah" />)
    const tile = screen.getByLabelText("Ahavah")
    expect(tile).toBeInTheDocument()
    expect(tile.querySelector("svg")).toBeInTheDocument()
  })

  it("accepts size variants", () => {
    const { rerender } = render(<SparkleTile size="md" aria-label="x" />)
    rerender(<SparkleTile size="lg" aria-label="x" />)
    expect(screen.getByLabelText("x")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npx vitest run tests/components/sparkle-tile.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/app/sparkle-tile.tsx`. Use the canonical 4-point sparkle path from `docs/handoff-desktop/design-system-v2.md §Sparkle` (copy verbatim — do NOT redraw). Wrap it in a `rounded-2xl` indigo-bg div with `aspect-square` and lime sparkle fill. Size variants `sm` 32 / `md` 40 / `lg` 48 / `xl` 56.

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tileVariants = cva(
  "inline-flex items-center justify-center rounded-2xl bg-[color:var(--color-persian-indigo)]",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-14 w-14",
      },
    },
    defaultVariants: { size: "md" },
  }
)

type Props = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof tileVariants>

export function SparkleTile({ size, className, ...rest }: Props) {
  return (
    <span className={cn(tileVariants({ size }), className)} {...rest}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-1/2 w-1/2 fill-[color:var(--color-lime)]"
      >
        {/* PASTE THE CANONICAL SPARKLE PATH FROM design-system-v2.md §Sparkle */}
      </svg>
    </span>
  )
}
```

NOTE: the comment `{/* PASTE … */}` is a directed action, not a placeholder — the engineer copies the path string from the spec. Replace the placeholder before running tests.

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run tests/components/sparkle-tile.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Migrate `desktop-sidebar.tsx`**

In `src/components/app/desktop-sidebar.tsx`, find the inlined `<div style={{ background: 'var(--color-persian-indigo)', … }}><BrandMark/></div>` lockup and replace with `<SparkleTile size="md" aria-label="Ahavah" />`. Add the import.

- [ ] **Step 6: Typecheck + vitest**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: tsc clean. Vitest: previous baseline + new green.

- [ ] **Step 7: Visual check** — open `/` at 1440×900; sidebar top-left now shows the canonical sparkle tile.

---

### Task 10: Audit `<EmptyState>` against spec §Empty

**Files:**
- Modify or rebuild: `src/components/app/empty-state.tsx`

- [ ] **Step 1: Read `docs/handoff-desktop/design-system-v2.md` §Pattern → Empty**

Expected composition: Sparkle/icon + Title (text-lg/600) + Description (text-sm/400 muted) + secondary CTA.

- [ ] **Step 2: Diff against current `empty-state.tsx`. If structure or typography diverges, rebuild to match.**

If a rebuild is required, write a brief Vitest test against the rebuilt API (renders title, description, optional action) before editing. Otherwise skip the test.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```
Expected: clean.

---

## Phase 3 — Contrast audit

### Task 11: Run `pnpm run audit:contrast` and fix any failures on light-mode tokens

**Files:**
- Modify (only if failures): `src/app/globals.css` `[data-theme="light"]` block

- [ ] **Step 1: Run the audit**

```bash
pnpm run audit:contrast
```

- [ ] **Step 2: For each failing combination on light-mode tokens, adjust the token (typically `--color-lime` saturation/lightness in oklch) and re-run**

The cream-surface lime is currently `oklch(0.78 0.22 119)` — if it fails AA at 14pt on `#FBF9F4`, darken to `oklch(0.72 0.22 119)` or `oklch(0.68 0.22 119)`. Re-audit after each adjustment.

- [ ] **Step 3: Once all pass, capture audit output to `docs/handoff-desktop/audit-contrast-2026-05-17.txt` for the record**

```bash
pnpm run audit:contrast > docs/handoff-desktop/audit-contrast-2026-05-17.txt 2>&1
```

- [ ] **Step 4: Visual smoke** — open `desktop-screens.html` and the live `/discover` page. Lime chips and lime buttons should look saturated but readable on cream.

---

## Phase 4 — Screen rebuilds (one task per route, priority order)

### Verification references (UPDATED 2026-05-17 — read before any screen rebuild)

For each screen there are FOUR canonical artifacts:

1. **Structure (theme-agnostic JSX):** `docs/handoff-desktop/desktop.jsx` — the React function for the screen. Byte-identical between `Ahavah-Claude Design/handoff/` and `Ahavah-Claude Design/dark-desktop-html/`. This is the structural source-of-truth.
2. **Per-screen build spec (.md):** `docs/handoff-desktop/screens/<NN>-<route>.md` — exact columns, gutters, content order, copy, primitives to compose, behaviour wiring. The CONTROLLER (not a subagent) must read this file before dispatching the per-screen subagent.
3. **Light reference render:** `docs/handoff-desktop/desktop-screens.html` — open at 1440×900, find the matching frame. This is the LIGHT theme visual target.
4. **Dark reference render:** `D:/Antigravity/ahavah-api/Ahavah-Claude Design/dark-desktop-html/<NN>-<route>.html` — open at 1440×900. This is the DARK theme visual target. (One file per screen, 14 total.)

### Per-screen verification gate (UPDATED — non-negotiable)

A screen is NOT done until the user has:
- Opened the live route at 1440×900 in LIGHT theme and confirmed it matches `desktop-screens.html` frame N.
- Toggled to DARK theme and confirmed it matches `dark-desktop-html/<NN>-<route>.html`.
- Replied "matches" (or "fix X then continue") in the conversation.

`tsc clean + vitest baseline` is necessary but NOT sufficient. The previous session's §3.3 failure ("never visually verified, shipped 14 broken screens") was caused by treating typecheck as a completion signal. Do not repeat.

### Per-screen rebuild template (applies to Tasks 12–25)

Every screen-rebuild task follows the same five steps. The variation is the route file, the canonical desktop.jsx function + line range, and the hooks/state to reuse. **The actual JSX is ported from `desktop.jsx` — read the function end-to-end before composing.**

The substitution rules, applied in every screen rebuild:

| Handoff (`desktop.jsx`) | Kit (this repo) |
|---|---|
| `<Pill variant="…">` | `<Pill variant="…">` (same names) |
| `<button … style={{ background:'var(--color-lime)', color:'#000', borderRadius:999 }}>Like</button>` | `<Button tone="cta" size="tap">Like</Button>` |
| `<button … style={{ background:'var(--color-lavender)', color:'#000' }}>Message</button>` | `<Button tone="brand" size="tap">Message</Button>` |
| `<button … style={{ background:'transparent', border:'1px solid var(--ink-3)' }}>Pass</button>` | `<Button variant="outline" size="tap">Pass</Button>` |
| Inline `<div style={{ background:'var(--card)', border:'1px solid var(--hairline)', borderRadius:24 }}>` | `<Card tone="elevated">` |
| Inline gradient indigo→lavender card | `<Card variant="gradient">` |
| Inline indigo-square+sparkle lockup | `<SparkleTile size="…" />` |
| Inline lavender frosted silhouette | `<BlurredAvatar size="…" />` |
| Hand-rolled photo+meta avatar | `<Avatar ring="lime" online>{<AvatarImage/>}</Avatar>` |
| Hand-rolled lock/disabled chip | `<Button tone="elevated" disabled>` or `<Pill variant="lavOutline">` |
| Hand-rolled `style={{ color:'var(--ink)' }}` | omit; the theme handles it |

### Task 12: Rebuild `/profile/[uuid]` desktop block (REBUILD FIRST — worst offender)

**Files:**
- Modify: `src/app/profile/[uuid]/page.tsx`
- Canonical: `docs/handoff-desktop/desktop.jsx` `ProfileDetailDesktop` lines 907–1106
- Reference screenshot: `docs/screenshots/handoff-target/05-profile-detail.png`

- [ ] **Step 1: Open canonical function end-to-end, note every layout primitive**

In `desktop.jsx` read `ProfileDetailDesktop` 907–1106 line-by-line. Note: 2-col grid `540px 1fr` with `gap:32`, `padding:24px 32px 32px`, `overflow:hidden`. Left col = back-link + 4/5 aspect photo card with timeline strip + huge centered initial + lavender compat pill bottom-right + 4-col thumbnail strip. Right col = name 40px/800 + nickname + map-pin location + 5 inline `<Pill variant="lavender">` LEFT, **160px-wide vertical action stack** on the RIGHT (Like lime 48h + Message lavender 48h + Pass outline 40h). Then scrollable bio + 2-col grid (About `<dl>` + 6-bar Compatibility) + interests pills + footer (Report + meta).

- [ ] **Step 2: In `src/app/profile/[uuid]/page.tsx`, locate the `hidden md:…` desktop block and DELETE its contents**

Keep the `md:hidden` mobile JSX untouched. Keep all top-level hooks (`useProfile(uuid)`, `useTokenBalance()`, action handlers) declared once at the component top.

- [ ] **Step 3: Port the canonical JSX into the now-empty desktop block, applying the substitution table above**

Compose with the kit primitives only — no hand-rolled `<div style={{ background:'var(--color-…') }}>`. Photo card uses `<Card tone="elevated">` with `aspect-[4/5]`. Action stack uses three `<Button>`s in a `flex flex-col gap-12px w-[160px]`. Compatibility breakdown uses `<Card tone="elevated">` containing six rows each with a label, a value, and a `<Progress>` colored by score band per spec §Pattern.

- [ ] **Step 4: Wire behavior from the existing mobile component**

The desktop block reads `profile`, `tokenState`, `likeMutation`, `passMutation`, `messageMutation` from the same hooks the mobile block uses. Action handlers are shared. The Message button: if `profile.matchedAt` is null, render as `tone="elevated" disabled` (per handoff §3.6 — the previous "navigate to /matches in unmatched state" was wrong; spec wants visually disabled).

- [ ] **Step 5: Typecheck + dev-browser visual verify**

```bash
npx tsc --noEmit
```
Open `http://localhost:3000/profile/<a real uuid>` at 1440×900. Screenshot to `docs/screenshots/rebuild/05-profile-detail.png`. Place it side-by-side with `docs/screenshots/handoff-target/05-profile-detail.png`. They must match in column structure, action-stack composition, typography hierarchy, and density. If not, iterate before declaring done.

- [ ] **Step 6: Full vitest**

```bash
npx vitest run
```
Expected: 20 baseline failures + Phase 1/2 greens. No new failures.

- [ ] **Step 7: Mark §9 row 05 in the handoff as done with the screenshot pair attached.**

---

### Task 13: Rebuild `/discover` desktop block

**Files:**
- Modify: `src/app/discover/page.tsx`
- Canonical: `desktop.jsx` `DiscoverDesktop` lines 434–586
- Reference screenshot: `docs/screenshots/handoff-target/04-discover.png`

- [ ] **Step 1: Read `DiscoverDesktop` 434–586 end-to-end. Note: 3-col grid (filters/deck/likes), action row composition, "New likes" card uses `<Card variant="gradient">` with `<BlurredAvatar>` silhouettes.**

- [ ] **Step 2: Delete the existing `hidden md:…` desktop block in `src/app/discover/page.tsx`; keep mobile JSX and top-level hooks.**

- [ ] **Step 3: Port JSX with substitutions. Remove all `style={{}}` inline patches. Action row: Pass `circle-lg` outline / Like `circle-2xl` cta / Super `circle-lg` brand (this is the corrected canonical naming from Task 2).**

- [ ] **Step 4: Wire behavior. Reuse `useDiscoverDeck()`, `useTokenBalance()`, the existing like/pass/super handlers.**

- [ ] **Step 5: Typecheck + visual verify side-by-side. Screenshot `docs/screenshots/rebuild/04-discover.png`. Mark §9 row 04.**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: tsc clean. 20 baseline.

---

### Task 14: Rebuild `/matches` desktop block

**Files:**
- Modify: `src/app/matches/page.tsx`
- Canonical: `desktop.jsx` `MatchesDesktop` lines 1499–1557
- Reference screenshot: `docs/screenshots/handoff-target/08-matches.png`

- [ ] **Step 1: Read `MatchesDesktop` 1499–1557 end-to-end. Note: tab strip (All / Unread / Recent) + responsive grid of match cards. Each card exposes BOTH "View profile" AND "Message" actions per spec.**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; keep mobile + hooks.**

- [ ] **Step 3: Port JSX. Match card uses `<Card tone="elevated">` wrapping `<Avatar ring="lime" online>` + name/age + last-message preview + two `<Button>`s (View profile outline / Message brand).**

- [ ] **Step 4: Wire `useMatches()` and the existing nav handlers.**

- [ ] **Step 5: Typecheck + visual side-by-side. Screenshot `docs/screenshots/rebuild/08-matches.png`. Mark §9 row 08.**

```bash
npx tsc --noEmit
```

---

### Task 15: Rebuild `/inbox` desktop block (with inline chat preview)

**Files:**
- Modify: `src/app/inbox/page.tsx`
- Canonical: `desktop.jsx` `InboxDesktop` lines 669–827
- Reference screenshot: `docs/screenshots/handoff-target/09-inbox.png`

- [ ] **Step 1: Read `InboxDesktop` 669–827 end-to-end. Note: 2-col split — left thread list (~360px), right active-chat preview panel with header / scrollable message log / composer footer. Empty state when no thread selected uses `<EmptyState>`.**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; keep mobile + hooks.**

- [ ] **Step 3: Port JSX. Right panel reuses the existing `<ChatHeader>`, message-bubble component, and `<ChatInput>` primitives, just laid out in the split-view rather than navigating to `/chat/[uuid]`.**

- [ ] **Step 4: Wire local state `selectedThreadId` (default = first thread or null). Use existing `useInboxThreads()` + `useChatStanzas(selectedThreadId)` hooks. Mobile path still navigates to `/chat/[uuid]`; only the desktop split-view inlines the chat.**

- [ ] **Step 5: Typecheck + visual side-by-side. Screenshot `docs/screenshots/rebuild/09-inbox.png`. Mark §9 row 09.**

```bash
npx tsc --noEmit
```

---

### Task 16: Rebuild `/profile` (own) desktop block

**Files:**
- Modify: `src/app/profile/page.tsx`
- Canonical: `desktop.jsx` `ProfileDesktop` lines 828–906
- Reference screenshot: `docs/screenshots/handoff-target/10-profile-own.png`

- [ ] **Step 1: Read `ProfileDesktop` 828–906 end-to-end.**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; keep mobile + hooks.**

- [ ] **Step 3: Port JSX with substitutions.**

- [ ] **Step 4: Wire reused hooks (`useMyProfile()`, edit handler).**

- [ ] **Step 5: Typecheck + visual side-by-side. Screenshot. Mark §9 row 10.**

```bash
npx tsc --noEmit
```

---

### Task 17: Rebuild `/map` desktop block

**Files:**
- Modify: `src/app/map/page.tsx`
- Canonical: `desktop.jsx` `MapDesktop` lines 1386–1498
- Reference screenshot: `docs/screenshots/handoff-target/07-map.png`

- [ ] **Step 1: Read `MapDesktop` 1386–1498 end-to-end. Note: full-bleed map + right rail with location chips + nearby profile cards.**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; keep mobile + hooks (`useMapResults()`, marker handlers).**

- [ ] **Step 3: Port JSX. Map iframe / canvas reuses the existing `<MapCanvas>` component; rail uses `<Card tone="elevated">` per nearby profile.**

- [ ] **Step 4: Typecheck + visual side-by-side. Screenshot. Mark §9 row 07.**

```bash
npx tsc --noEmit
```

---

### Task 18: Rebuild `/paywall` desktop block

**Files:**
- Modify: `src/app/paywall/page.tsx`
- Canonical: `desktop.jsx` `PaywallDesktop` lines 1111–1204
- Reference screenshot: `docs/screenshots/handoff-target/11-paywall.png`

- [ ] **Step 1: Read `PaywallDesktop` 1111–1204 end-to-end. Note: hero + 3 tier cards + features list. Tier cards use `<Card variant="tier-active" tier="silver">` for the highlighted plan (Task 6 added this variant).**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; keep mobile + hooks.**

- [ ] **Step 3: Port JSX. CRITICAL: `<TokenSpendSheet currentBalance>` race — per handoff §8.5, only pass a real number when `useTokenBalance().state === "happy"`; otherwise pass `null` so the sheet renders optimistic confirm. Verify this stays correct in the port.**

- [ ] **Step 4: Typecheck + visual side-by-side. Screenshot. Mark §9 row 11.**

```bash
npx tsc --noEmit
```

---

### Task 19: Rebuild `/verify` desktop block

**Files:**
- Modify: `src/app/verify/page.tsx`
- Canonical: `desktop.jsx` `VerifyDesktop` lines 1205–1294
- Reference screenshot: `docs/screenshots/handoff-target/12-verify.png`

- [ ] **Step 1: Read `VerifyDesktop` 1205–1294 end-to-end. 3 tier cards (Bronze / Silver / Gold) using `<Card variant="tier-active" tier={...}>` for the user's current tier.**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; keep mobile + hooks.**

- [ ] **Step 3: Port JSX.**

- [ ] **Step 4: Typecheck + visual side-by-side. Screenshot. Mark §9 row 12.**

```bash
npx tsc --noEmit
```

---

### Task 20: Rebuild `/settings` desktop block (including sub-pages)

**Files:**
- Modify: `src/app/settings/page.tsx`, plus settings sub-pages (account, notifications, privacy, etc.) — keep their mobile JSX; replace desktop block on each
- Canonical: `desktop.jsx` `SettingsDesktop` lines 1295–1385
- Reference screenshot: `docs/screenshots/handoff-target/13-settings.png`

- [ ] **Step 1: Read `SettingsDesktop` 1295–1385 end-to-end. Note: 2-col layout — left nav (sections), right active panel.**

- [ ] **Step 2: In `src/app/settings/page.tsx`, replace desktop block per spec.**

- [ ] **Step 3: For each sub-page, replace its desktop block to render only the right-panel content (the left nav is owned by the parent settings page or a shared shell — choose the simpler route: extract a `<SettingsShell>` in `src/components/app/settings-shell.tsx` only if it's reused 3+ times; otherwise inline).**

- [ ] **Step 4: Typecheck + visual side-by-side. Screenshot. Mark §9 row 13.**

```bash
npx tsc --noEmit
```

---

### Task 21: Rebuild `/locked` desktop block

**Files:**
- Modify: `src/app/locked/page.tsx`
- Canonical: `desktop.jsx` `LockedDesktop` lines 1558–1591
- Reference screenshot: `docs/screenshots/handoff-target/14-locked.png`

- [ ] **Step 1: Read `LockedDesktop` 1558–1591 end-to-end. Centered card; small surface.**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; port canonical.**

- [ ] **Step 3: Typecheck + visual. Screenshot. Mark §9 row 14.**

```bash
npx tsc --noEmit
```

---

### Task 22: Rebuild `/match` desktop block

**Files:**
- Modify: `src/app/match/page.tsx`
- Canonical: `desktop.jsx` `MatchDesktop` lines 587–668
- Reference screenshot: `docs/screenshots/handoff-target/06-match.png`

- [ ] **Step 1: Read `MatchDesktop` 587–668 end-to-end. Note: gradient hero + confetti + 2 lockup-photo cards + CTAs.**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; port canonical with substitutions.**

- [ ] **Step 3: Typecheck + visual. Screenshot. Mark §9 row 06.**

```bash
npx tsc --noEmit
```

---

### Task 23: Rebuild `/onboarding` + 14 subroutes desktop block

**Files:**
- Modify: `src/app/onboarding/page.tsx` and every subroute under `src/app/onboarding/`
- Canonical: `desktop.jsx` `OnboardingDesktop` line 344+ (plus per-step JSX in `desktop.jsx`)
- Reference screenshot: `docs/screenshots/handoff-target/03-onboarding.png`

- [ ] **Step 1: Read `OnboardingDesktop` and each step's desktop JSX in `desktop.jsx`. Note: shared shell (left-side progress + title pane, right-side step body). The shell is reused across every subroute.**

- [ ] **Step 2: Extract a `<OnboardingDesktopShell>` component in `src/components/app/onboarding-desktop-shell.tsx`** — it accepts `step`, `totalSteps`, `title`, `subtitle`, `children` and renders the canonical left progress + right body layout. Mobile shell stays as the existing `OnboardingShell`.

- [ ] **Step 3: In every onboarding subroute page, replace its `hidden md:…` desktop block with `<OnboardingDesktopShell step={…} title={…}>{stepBody}</OnboardingDesktopShell>`. Reuse the same step body JSX where possible (e.g. the choice grid for `/onboarding/looking-for`).**

- [ ] **Step 4: Typecheck. Walk each subroute at 1440×900 and screenshot.**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Mark §9 row 03 (treat the onboarding flow as one row).**

---

### Task 24: Rebuild `/auth/sign-up` + `/auth/sign-in` desktop blocks

**Files:**
- Modify: `src/app/auth/sign-up/page.tsx`, `src/app/auth/sign-in/page.tsx`
- Canonical: `desktop.jsx` `SignUpDesktop` line 237+
- Reference screenshot: `docs/screenshots/handoff-target/02-sign-up.png`

- [ ] **Step 1: Read `SignUpDesktop` end-to-end. Note: canonical 5fr/7fr split (brand pane left, form pane right) — NOT a centered card.**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block on both files; port canonical with substitutions. Sign-in mirrors sign-up structure with sign-in copy + OTP entry.**

- [ ] **Step 3: Wire existing hooks (`useSignUpMutation()`, `useSignInOtp()`).**

- [ ] **Step 4: Typecheck + visual side-by-side both routes. Screenshot. Mark §9 row 02.**

```bash
npx tsc --noEmit
```

---

### Task 25: Rebuild `/` (welcome) desktop block

**Files:**
- Modify: `src/app/page.tsx`
- Canonical: `desktop.jsx` `WelcomeDesktop` line 148+
- Reference screenshot: `docs/screenshots/handoff-target/01-welcome.png`

- [ ] **Step 1: Read `WelcomeDesktop` end-to-end. Note: brand pane + decorative sparkles + primary CTA (Sign up) + secondary (Sign in).**

- [ ] **Step 2: Delete existing `hidden md:…` desktop block; port canonical. Replace inline `<div style={{ background: indigo…}}>` brand-mark with `<SparkleTile size="xl" />`. Decorative background sparkles per spec.**

- [ ] **Step 3: Typecheck + visual. Screenshot. Mark §9 row 01.**

```bash
npx tsc --noEmit
```

---

## Phase 5 — Final verification

### Task 26: End-to-end audit + mobile regression check + handoff close

- [ ] **Step 1: Re-run contrast audit**

```bash
pnpm run audit:contrast > docs/handoff-desktop/audit-contrast-final.txt 2>&1
```
Expected: all combinations PASS.

- [ ] **Step 2: Open `docs/handoff-desktop/desktop-screens.html` at 1440×900 in one window and the live app at `http://localhost:3000` in another. Walk every one of the 14 routes side-by-side. List any gap (≥3px misalignment, wrong primitive, missing element) in `docs/superpowers/handoffs/2026-05-17-desktop-light-rebuild-final-notes.md`. Fix or document each.**

- [ ] **Step 3: Mobile regression check** — resize the live app to 414×900 and walk the same 14 routes. The mobile dark surface must be identical to the pre-rebuild baseline (the `.ahavah-app` indigo 414px column intact). If any route regressed, the `md:hidden` / `hidden md:…` discipline failed there; fix.

- [ ] **Step 4: Final typecheck + vitest**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: tsc clean. Vitest: 20 baseline failures + Phase 1/2 new greens. No new failures.

- [ ] **Step 5: Update the handoff §9 status table** — every row marked done with a screenshot pair attached.

- [ ] **Step 6: STOP. Report to the user. Per handoff §10 rule 10: no commits until the user gives the word.**

Suggested message format:
- "Desktop rebuild complete. tsc clean. Vitest 20 baseline. Contrast audit pass. 14/14 routes verified side-by-side against `desktop-screens.html`. Mobile baseline intact at 414×900. Final notes at `docs/superpowers/handoffs/2026-05-17-desktop-light-rebuild-final-notes.md`. Ready to commit when you give the word — suggested split: one commit per phase (foundation/primitives/patterns/routes-batch-1/routes-batch-2) for reviewability."

---

## Notes for the executing engineer

- **Per `AGENTS.md`:** read `node_modules/next/dist/docs/` before any non-trivial Next 16 API usage. App Router conventions in this repo may differ from training data.
- **Per `feedback_design_system_requirements`:** the 73-item DS checklist is non-negotiable; the spec is the contract.
- **Per `feedback_invoke_design_skill_for_placement`:** invoke `/frontend-design` in the controller before dispatching UI agents — it grounds placement decisions in the canonical spec.
- **Per `feedback_quad_agent_strategy`:** Phase 4 screens 12, 13, 14, 15 are good candidates for parallel dispatch ONLY AFTER Phases 1–3 land (primitives stable). Do not parallelize before then — see handoff §3.4.
- **Per `feedback_test_locally_first`:** every screen task includes a 1440×900 dev-browser screenshot gate. typecheck-clean ≠ design-correct (handoff §3.3).
- **Per `feedback_check_uncommitted_before_push`:** there are no commits yet on this initiative. Stay unstaged throughout. `git status --short` should show all your edits in the working tree until the user releases the commit hold.
