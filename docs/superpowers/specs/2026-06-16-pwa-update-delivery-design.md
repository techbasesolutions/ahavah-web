# Reliable PWA Update Delivery — Design

**Goal:** Deploys reach users even when their app is already open. Today the SW `skipWaiting()`s + `clients.claim()`s (new SW takes control) but nothing reloads the open page, so its loaded JS/CSS stays stale until a manual relaunch.

**Approved UX (brainstorming 2026-06-16):** auto-refresh when the app is reopened from background; a dismissible "new version" bar during an actively-used session. Defaults: ~30-min poll interval, dismissible bar (not a transient toast). No force-critical flag (YAGNI). Extend the existing custom `sw.js` (no Workbox migration).

## Current state
- `public/sw.js`: custom SW, network-first HTML + cache-first hashed assets, `CACHE` = per-deploy commit hash, `skipWaiting()` in `install`, `clients.claim()` in `activate`. No reload trigger.
- `src/components/sw-register.tsx`: registers `/sw.js` on mount; **no update handling** (no `update()`, `updatefound`, `controllerchange`, reload).
- `next.config.ts`: already bypasses Vercel edge cache for `/sw.js` (keep).

## Units

### 1. `public/sw.js` — let the app control when to apply
- **Remove** `self.skipWaiting()` from `install` → the new SW installs and **waits** instead of silently swapping under a stale page.
- **Add** a `message` listener: `if (event.data?.type === "SKIP_WAITING") self.skipWaiting();`.
- Keep `clients.claim()` (activate), the `CACHE` name, fetch strategy, push handlers — unchanged.

### 2. `src/lib/use-app-update.ts` — detect + decide + apply (replaces sw-register's bare registration)
- **Register** `/sw.js` (move the existing registration here; keep the dev-mode unregister/skip).
- **Detect:** `registration.update()` on `visibilitychange → visible` AND on a 30-min `setInterval`. Watch for a newly-installed waiting worker: on `registration` `updatefound`, the new `registration.installing` worker's `statechange` → `installed` **while `navigator.serviceWorker.controller` exists** = a real update (not first install).
- **Decide by context:** track the source of the check that produced the waiting SW.
  - Produced by a **focus** check (or a waiting SW was already present when the page re-focused) → **auto-apply**.
  - Produced by an **interval** check (active use) → set `updateReady` state (show the bar).
- **Apply:** `waiting.postMessage({ type: "SKIP_WAITING" })`; a one-shot `controllerchange` listener then `location.reload()`. Guard with a module flag so it reloads at most once (avoids the classic controllerchange reload loop).
- Returns `{ updateReady, applyUpdate }` for the bar.

### 3. `src/components/update-bar.tsx` — active-use prompt
- Consumes `useAppUpdate()`. When `updateReady`, render a small fixed bottom bar (kit primitives + tokens): "A new version is ready" + a **Refresh** button (`applyUpdate`) + a dismiss X. Dismiss hides it for the session (the next reopen auto-applies anyway). No em-dashes.
- Mounted from `RootLayout` alongside (replacing) `ServiceWorkerRegister`.

## Data flow
deploy → new `sw.js` server-side → next `update()` check (re-focus / 30-min) fetches it → installs + waits → hook detects waiting → (reopen path: auto-apply | active path: bar) → `SKIP_WAITING` → SW activates + claims → `controllerchange` → `location.reload()` → fresh bundle.

## Edge cases
- **Reload loop:** one-shot module flag; reload only once per `controllerchange`.
- **First install** (no `controller`): no reload, no bar.
- **Dev mode:** SW disabled (unchanged) → hook no-ops in dev.
- **Auto-reload loses unsaved transient state** (e.g. half-typed chat) only if a deploy lands in the seconds the user was away mid-action — rare; active sessions get the bar, not a yank. (A "skip auto-reload if a text input has unsaved content" guard is a later refinement if it bites.)
- **Edge cache:** `/sw.js` bypass already in next.config — keep.

## Testing
- Unit: the decide logic (focus → auto, interval → bar) and the reload-once guard, mocking `registration` + `visibilityState` + worker states.
- The SW `message` handler.
- Manual / your eyeball (Chrome blocked for me): deploy → reopen app → auto-refresh; deploy → keep active → bar appears → Refresh reloads.

## Out of scope
Force-critical-update flag; Workbox/serwist migration; cross-tab broadcast.
