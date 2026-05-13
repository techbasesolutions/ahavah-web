# Phase W — Agent A: Auth + Profile wiring

_Self-contained dispatch prompt. Copy the entire contents of this file into the Agent tool as the `prompt` parameter, `subagent_type: "general-purpose"`, `run_in_background: true`._

---

You are **Phase W Agent A — Auth + Profile** for the Ahavah PWA.

**Worktree:** `d:/Antigravity/ahavah-web-phase-w-a` (branch: `phase-w-agent-a`)
**Project root referenced in code:** `d:/Antigravity/ahavah-web` (use the worktree path when editing; the imports + structure are identical).
**Logging file:** `d:/Antigravity/ahavah-web-phase-w-a/logs/phase-w-agent-a.md`

## Mission

Replace every localStorage read/write of the user profile + auth state with real HTTP calls to the backend at `https://api.ahavah.app`. Wire the signup → email-OTP → onboarding pipeline end-to-end against the real backend so a fresh visitor can register, verify, complete onboarding, and have a persistent server-backed profile.

## BEFORE YOU WRITE ANY CODE — READ IN ORDER

1. **The master plan** — `d:/Antigravity/ahavah-web/docs/phase-w-plan.md` — sections 2 (outcome), 4 (workstream), 6 (file ownership). 5-min read; gives you context for why your scope ends where it ends.
2. **The quad-agent protocol** — `d:/Antigravity/loprofile-backend-v2/docs/quad-agent-protocol.md` — sections on Logging, Blocker, Completion. 3-min read; sets the communication contract.
3. **The current `useProfile` hook** — `d:/Antigravity/ahavah-web-phase-w-a/src/lib/use-profile.ts` (entire file, ~60 lines) and `d:/Antigravity/ahavah-web-phase-w-a/src/lib/use-profile-storage.ts` (entire file, ~25 lines).
4. **The Profile schema** — `d:/Antigravity/ahavah-web-phase-w-a/src/lib/profile-schema.ts` (it's long; read the top 100 lines + the `Profile` type at the bottom).
5. **The shared API client** (orchestrator-built, read-only for you) — `d:/Antigravity/ahavah-web-phase-w-a/src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/storage-keys.ts`. These exist when you start.
6. **Backend endpoint signatures for your scope** — `d:/Antigravity/ahavah-api/service/api/__init__.py` lines 173–229 (auth), 297–427 (profile). 5-min skim; confirms the wire format the api-client targets.

If any of files 5 are missing, BLOCKER — orchestrator hasn't completed Foundation. Do not proceed.

## Hard rules (non-negotiable)

- **No new HTTP client library.** Use `api-client.ts` and nothing else. Adding `swr` / `react-query` / `axios` would force B/C/D to follow suit; that's a cross-cutting decision the orchestrator owns.
- **Don't touch `api-client.ts`, `api-types.ts`, or `storage-keys.ts`.** If you need a new endpoint, BLOCKER. The orchestrator extends.
- **`useProfile`'s external API stays identical.** Consumers (37 files) call `const { profile, setProfile, update, loaded } = useProfile()`. You may ADD methods (`signOut`, `refreshProfile`) but do not remove or rename existing ones. Verify with `grep -r "useProfile()" src/` before merging.
- **localStorage becomes ephemeral cache only.** The source of truth is the backend. localStorage is a hydration shortcut so the UI paints quickly while the server profile fetches in the background. On any backend write, also update the cache. On stale cache, prefer server.
- **No em-dashes in user-facing strings.** Project convention — use `:` `,` `.` `|` instead.
- **No `useState` for visual atoms.** Use existing primitives (`Pill`, `Input`, `Button`, `Card`, etc.) from `@/components/ui` and `@/components/kibo-ui`.
- **TDD where pragmatic.** Pure functions (token encoders, OTP validators) get vitest tests in `tests/lib/*.test.ts`. UI flows get smoke walks (you describe the manual test, you don't have to automate it).
- **One commit per task** in the task list below. Conventional-commit style (`feat:`, `fix:`, `chore:`). Sign off every commit with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Don't push, don't merge.** Orchestrator handles merge to master.

## File ownership

### Write (exclusively yours)

- `src/lib/use-profile-storage.ts` — full rewrite
- `src/lib/use-profile.ts` — extend with `signOut()` + `refreshProfile()`, preserve existing API
- `src/lib/auth-otp.ts` — NEW (OTP request / verify helpers, pure wrappers over `api-client`)
- `src/app/auth/sign-up/page.tsx` — wire real POST `/request-otp`
- `src/app/auth/sign-in/page.tsx` — NEW (mirrors signup but for returning users; uses same `/request-otp` endpoint with `is_signup: false`)
- `src/app/page.tsx` — welcome page: real "Sign in" + "Get started" handlers (currently the buttons are dumb Links)
- `src/app/onboarding/verify-email/page.tsx` — wire real POST `/check-otp`
- `src/app/onboarding/verify-phone/page.tsx` — wire real POST `/check-otp` with phone OTP variant
- `src/app/onboarding/complete/page.tsx` — write-through final profile commit to backend before nav to `/discover`
- `tests/lib/use-profile-storage.test.ts` — NEW (test the cache-write-through behavior)
- `tests/lib/auth-otp.test.ts` — NEW (test the OTP wrapper helpers)

### Read-only (everywhere else)

- `src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/storage-keys.ts` — orchestrator-owned
- `src/lib/profile-schema.ts` — locked; if a type extension needed, BLOCKER
- `src/components/ui/*`, `src/components/kibo-ui/*` — primitives
- All other onboarding pages (name, dob, gender, marital-status, children, looking-for, photos, country, languages, bio, polygyny, assembly, relocation, verification) — they read from `useProfile` whose surface you preserve; they don't get rewritten by you
- `src/lib/discover-engine.ts`, `src/lib/profile-sample.ts` — Agent B's domain in practice; preserve unchanged
- `src/lib/photo-storage.ts` — Agent C's domain
- `src/lib/chat-client.ts` (when it exists) — Agent D's domain

## Tasks

Execute these tasks IN ORDER. Each task is one focused commit. Log before AND after each task in `logs/phase-w-agent-a.md`.

### Task A.1 — Cache layer + storage rewrite (~30 min)

**Goal:** rewrite `use-profile-storage.ts` so localStorage is a cache, not source of truth.

**Steps:**

- [ ] Read `src/lib/use-profile-storage.ts` to see its current shape (~25 lines).
- [ ] Write `tests/lib/use-profile-storage.test.ts` with these cases:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadProfileFromCache,
  saveProfileToCache,
  clearProfileCache,
} from "@/lib/use-profile-storage";

describe("use-profile-storage cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when cache is empty", () => {
    expect(loadProfileFromCache()).toBeNull();
  });

  it("round-trips a profile through cache", () => {
    const profile = { firstName: "Esther", age: 28 };
    saveProfileToCache(profile);
    expect(loadProfileFromCache()).toEqual(profile);
  });

  it("clearProfileCache removes the entry", () => {
    saveProfileToCache({ firstName: "Esther" });
    clearProfileCache();
    expect(loadProfileFromCache()).toBeNull();
  });

  it("returns null when stored JSON is corrupted", () => {
    localStorage.setItem("ahavah.profile.v1", "not-json");
    expect(loadProfileFromCache()).toBeNull();
  });
});
```

- [ ] Run `pnpm exec vitest run tests/lib/use-profile-storage.test.ts` — expect 4 FAILs (functions don't exist yet).
- [ ] Rewrite `src/lib/use-profile-storage.ts`:

```typescript
import type { Profile } from "@/lib/profile-schema";
import { PROFILE_CACHE_KEY } from "@/lib/storage-keys";

/**
 * Local cache for the current user's profile. Post-Phase W, the backend is the
 * source of truth — this cache exists only so the first paint can render
 * without waiting for the network. Any write here is also written through to
 * the backend (see `useProfile.update()`).
 *
 * Returns null on missing key OR corrupted JSON (treated identically — the
 * server fetch will refill the cache).
 */
export function loadProfileFromCache(): Partial<Profile> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<Profile>;
  } catch {
    return null;
  }
}

export function saveProfileToCache(profile: Partial<Profile>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

export function clearProfileCache(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_CACHE_KEY);
}
```

- [ ] Re-run the test file. Expect 4 PASS.
- [ ] `pnpm exec tsc --noEmit` + `pnpm exec eslint --max-warnings=0 src/lib/use-profile-storage.ts tests/lib/use-profile-storage.test.ts` — both clean.
- [ ] Commit: `feat(phase-w-a): use-profile-storage becomes cache, backend is source of truth`.

### Task A.2 — `useProfile` extends with HTTP source-of-truth (~45 min)

**Goal:** `useProfile()` now hydrates from backend on mount, falls back to cache while the fetch resolves, write-through on every update.

**Steps:**

- [ ] Read `src/lib/use-profile.ts` to see current shape.
- [ ] Rewrite to the contract below. Note: the EXTERNAL shape `{ profile, setProfile, update, loaded }` stays identical; only the internals change.

```typescript
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Profile } from "@/lib/profile-schema";
import {
  loadProfileFromCache,
  saveProfileToCache,
  clearProfileCache,
} from "@/lib/use-profile-storage";
import { apiClient, ApiError } from "@/lib/api-client";

/**
 * The single source of profile state in the app. Reads:
 *   - Renders synchronously from the localStorage cache (instant paint).
 *   - In the background, fetches /me from the backend, replaces state, refreshes cache.
 *
 * Writes:
 *   - `setProfile` / `update` mutate local state immediately (optimistic),
 *     write through to cache, then PATCH /profile-info. On server error,
 *     state rolls back and the caller sees a thrown ApiError.
 */
export type UseProfileResult = {
  profile: Partial<Profile>;
  setProfile: (next: Partial<Profile>) => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<void>;
  loaded: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export function useProfile(): UseProfileResult {
  const [profile, setProfileState] = useState<Partial<Profile>>(() =>
    loadProfileFromCache() ?? {},
  );
  const [loaded, setLoaded] = useState(false);
  const lastServerSnapshot = useRef<Partial<Profile> | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const server = await apiClient.get<Partial<Profile>>("/me");
      lastServerSnapshot.current = server;
      setProfileState(server);
      saveProfileToCache(server);
    } catch (err) {
      // 401 — user signed out elsewhere. Clear cache.
      if (err instanceof ApiError && err.status === 401) {
        clearProfileCache();
        setProfileState({});
      }
      // Other errors leave the cache-rendered profile alone; user sees stale data but no crash.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const update = useCallback(async (patch: Partial<Profile>) => {
    const prev = profile;
    const next = { ...prev, ...patch };
    setProfileState(next);
    saveProfileToCache(next);
    try {
      await apiClient.patch("/profile-info", patch);
      lastServerSnapshot.current = next;
    } catch (err) {
      // Roll back on server reject.
      setProfileState(prev);
      saveProfileToCache(prev);
      throw err;
    }
  }, [profile]);

  const setProfile = useCallback(async (next: Partial<Profile>) => {
    const prev = profile;
    setProfileState(next);
    saveProfileToCache(next);
    try {
      // Compute diff to keep the patch payload minimal.
      const diff: Partial<Profile> = {};
      for (const key of Object.keys(next) as Array<keyof Profile>) {
        if ((next as Record<string, unknown>)[key as string] !== (prev as Record<string, unknown>)[key as string]) {
          (diff as Record<string, unknown>)[key as string] = (next as Record<string, unknown>)[key as string];
        }
      }
      if (Object.keys(diff).length > 0) {
        await apiClient.patch("/profile-info", diff);
      }
      lastServerSnapshot.current = next;
    } catch (err) {
      setProfileState(prev);
      saveProfileToCache(prev);
      throw err;
    }
  }, [profile]);

  const signOut = useCallback(async () => {
    try {
      await apiClient.post("/sign-out", {});
    } catch {
      // Even if the server call fails, clear local state.
    }
    clearProfileCache();
    setProfileState({});
    lastServerSnapshot.current = null;
  }, []);

  return { profile, setProfile, update, loaded, signOut, refreshProfile };
}
```

- [ ] `pnpm exec tsc --noEmit` clean.
- [ ] `grep -rn "useProfile()" src/` — confirm every existing consumer still compiles (the external shape is preserved).
- [ ] Commit: `feat(phase-w-a): useProfile hydrates from backend with cache + write-through`.

### Task A.3 — `auth-otp.ts` helper module + tests (~30 min)

**Goal:** small typed wrapper over the OTP endpoints so the UI doesn't repeat the request shape.

**Steps:**

- [ ] Write `tests/lib/auth-otp.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestEmailOtp, checkOtp } from "@/lib/auth-otp";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: { post: vi.fn() },
  ApiError: class extends Error {
    constructor(public status: number, public body: unknown) { super(); }
  },
}));

describe("auth-otp", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("requestEmailOtp posts the email", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    await requestEmailOtp("user@example.com");
    expect(apiClient.post).toHaveBeenCalledWith("/request-otp", { email: "user@example.com" });
  });

  it("checkOtp posts the code", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ session_token: "abc" });
    const result = await checkOtp("user@example.com", "123456");
    expect(apiClient.post).toHaveBeenCalledWith("/check-otp", { email: "user@example.com", otp: "123456" });
    expect(result).toEqual({ session_token: "abc" });
  });
});
```

- [ ] Implement `src/lib/auth-otp.ts`:

```typescript
import { apiClient } from "@/lib/api-client";

export async function requestEmailOtp(email: string): Promise<void> {
  await apiClient.post("/request-otp", { email });
}

export type CheckOtpResult = {
  session_token: string;
  is_new_account: boolean;
};

export async function checkOtp(email: string, otp: string): Promise<CheckOtpResult> {
  return apiClient.post<CheckOtpResult>("/check-otp", { email, otp });
}
```

- [ ] Run vitest — expect both pass.
- [ ] Commit: `feat(phase-w-a): auth-otp helpers (request + check)`.

### Task A.4 — Welcome page wires real handlers (~20 min)

**Goal:** `/` (welcome page) "Get started" and "Sign in" buttons navigate to the real signup / signin flows.

**Steps:**

- [ ] Read `src/app/page.tsx` to see what it currently does.
- [ ] Update the two CTA buttons to navigate to `/auth/sign-up` and `/auth/sign-in` respectively (use `next/link` `<Link>` — these are non-async navigations). If they already do this, no change needed; verify by reading.
- [ ] Smoke-walk: `pnpm dev`, open `http://localhost:3000`, tap each button, confirm correct destination.
- [ ] Commit if changed: `feat(phase-w-a): welcome page CTAs route to real signup/signin`.

### Task A.5 — `/auth/sign-up` calls real backend (~45 min)

**Goal:** the signup form actually requests an OTP and routes to `/onboarding/verify-email`.

**Steps:**

- [ ] Read `src/app/auth/sign-up/page.tsx`. Note the current `handleSubmit` is `setTimeout(250) → window.location.href = "/onboarding/verify-email"`.
- [ ] Replace `handleSubmit` with:

```typescript
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestEmailOtp } from "@/lib/auth-otp";
import { ApiError } from "@/lib/api-client";
// ... existing imports

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");  // kept for the existing strength meter; not sent
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestEmailOtp(email);
      // Cache the email so /onboarding/verify-email can read it.
      sessionStorage.setItem("ahavah.pending-email", email);
      router.push("/onboarding/verify-email");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many requests. Try again in a few minutes.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("That email looks malformed. Check it and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ... rest of the component: wire `disabled={submitting}` on the submit button,
  //     render {error && <p className="text-pink mt-2">{error}</p>} below the form.
}
```

- [ ] **Important: the current schema does NOT send a password to the backend.** Duolicious uses email-only OTP auth (no passwords). Keep the password field visible in the UI (per spec) but do not transmit it — it's used only by the strength meter (and is a UX gate). This is correct per the master plan §0.7 + the backend's `/request-otp` signature which takes only `email`. Document this in a code comment so future maintainers don't wonder.

Actually, **reconsider:** if Duolicious is passwordless, the current sign-up password field is misleading. Coordinate with the orchestrator: BLOCKER if you think the password field should be removed from the UI; otherwise leave it and document in code.

- [ ] Smoke-walk: enter a real email, submit, confirm an OTP arrives at that inbox (assumes orchestrator's Foundation has wired Resend and seeded the test domain).
- [ ] Commit: `feat(phase-w-a): /auth/sign-up requests real OTP`.

### Task A.6 — `/auth/sign-in` page (~30 min)

**Goal:** returning users hit `/auth/sign-in`, enter their email, get an OTP, complete the same flow.

**Steps:**

- [ ] Create `src/app/auth/sign-in/page.tsx` mirroring sign-up but with single email field, no password, copy: heading "Welcome back" + "Enter your email and we'll send a sign-in code." + CTA "Send code".
- [ ] Same handler: `await requestEmailOtp(email); sessionStorage.setItem("ahavah.pending-email", email); router.push("/onboarding/verify-email");`.
- [ ] Smoke-walk parallel to A.5.
- [ ] Commit: `feat(phase-w-a): /auth/sign-in page for returning users`.

### Task A.7 — `/onboarding/verify-email` wires real OTP check (~45 min)

**Goal:** the 6-box CodeInput, on completion, calls `/check-otp`, stores the session cookie (handled server-side via `Set-Cookie`), and advances to the next onboarding step.

**Steps:**

- [ ] Read `src/app/onboarding/verify-email/page.tsx`. Find the place where the CodeInput's `onComplete` fires (currently it's a mock).
- [ ] Wire as:

```typescript
const handleCodeComplete = async (code: string) => {
  const email = sessionStorage.getItem("ahavah.pending-email");
  if (!email) {
    setError("Session expired. Start over.");
    router.push("/auth/sign-up");
    return;
  }
  setSubmitting(true);
  try {
    const result = await checkOtp(email, code);
    sessionStorage.removeItem("ahavah.pending-email");
    // session_token is set as an httpOnly cookie by the server response;
    // we don't store it client-side. Just refresh the profile.
    await refreshProfile();
    if (result.is_new_account) {
      router.push("/onboarding/name");  // first onboarding step for new accounts
    } else {
      router.push("/discover");  // returning users go straight to the app
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setError("That code didn't match. Try again.");
    } else {
      setError("Something went wrong. Please try again.");
    }
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] Use the existing `useProfile()` hook to get `refreshProfile`.
- [ ] **Crucial:** the backend must set the session cookie as `Set-Cookie: duo_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/`. Confirm in `api-client.ts` that `credentials: 'include'` is set so cookies are sent on subsequent requests. If not, BLOCKER (orchestrator-owned file).
- [ ] Commit: `feat(phase-w-a): /onboarding/verify-email validates OTP and starts session`.

### Task A.8 — `/onboarding/verify-phone` parallel wiring (~30 min)

The backend OTP flow is the same shape for phone (different field name; the backend accepts either). Mirror A.7 but with phone field + `requestPhoneOtp` (you'll need to add a sibling helper to `auth-otp.ts` calling `/request-otp` with a `phone` field instead of `email`).

- [ ] Add `requestPhoneOtp(phone: string)` and `checkPhoneOtp(phone: string, otp: string)` to `auth-otp.ts` + tests.
- [ ] Wire the page handler.
- [ ] Commit: `feat(phase-w-a): /onboarding/verify-phone validates OTP via SMS`.

### Task A.9 — `/onboarding/complete` write-through (~20 min)

**Goal:** before navigating to `/discover`, ensure the full profile is committed to the backend (in case any intermediate step didn't write through — defensive).

**Steps:**

- [ ] Read `src/app/onboarding/complete/page.tsx`.
- [ ] On mount, call `useProfile().update({})` to trigger a no-op write that confirms server state matches client state. If the server returns a 4xx, log it and stay on this page with an error pill rather than advancing.
- [ ] Update the existing "Start matching" CTA's handler:

```typescript
const handleStartMatching = async () => {
  setSubmitting(true);
  try {
    // Trigger a refresh so /discover loads with fresh server state.
    await refreshProfile();
    router.push("/discover");
  } catch {
    setError("We couldn't finalise your profile. Refresh and try again.");
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] Commit: `feat(phase-w-a): /onboarding/complete confirms server profile before launch`.

### Task A.10 — Sign-out wiring on /profile + /settings/account (~20 min)

**Goal:** the "Sign out" affordance on profile + account-settings calls the real `signOut()` and lands the user back on `/`.

**Steps:**

- [ ] Read `src/app/profile/page.tsx` + `src/app/settings/account/page.tsx`.
- [ ] Find the existing "Sign out" buttons (per SP15 they live on one of these surfaces). Wire to:

```typescript
const { signOut } = useProfile();

const handleSignOut = async () => {
  await signOut();
  router.push("/");
};
```

- [ ] Smoke-walk: sign in, navigate to profile, tap Sign out, confirm landed on `/` and `useProfile().profile === {}`.
- [ ] Commit: `feat(phase-w-a): real sign-out wiring`.

### Task A.11 — Final verification (~30 min)

**Steps:**

- [ ] `pnpm exec tsc --noEmit` — clean.
- [ ] `pnpm exec eslint --max-warnings=0` on all touched files — clean.
- [ ] `pnpm exec vitest run` — all existing tests + your new tests pass.
- [ ] `pnpm build` — clean (the production build catches issues `tsc --noEmit` misses).
- [ ] **End-to-end smoke walk:**
  1. Open `http://localhost:3000/` in a fresh incognito window.
  2. Tap "Get started" → land on `/auth/sign-up`.
  3. Enter a fresh email (use a real Resend-test inbox — orchestrator's Foundation seeded one) + any password.
  4. Submit. Land on `/onboarding/verify-email`. Check email; OTP arrived.
  5. Enter OTP. Land on `/onboarding/name`.
  6. Walk through the full onboarding wizard (you can sample-fill each field). At each step, open DevTools → Network and confirm a `PATCH /profile-info` fires after the field is filled.
  7. After `/onboarding/relocation`, you should land on `/onboarding/verification` (the tier cards). Tap "Skip for now" → `/onboarding/complete`.
  8. Tap "Start matching" → `/discover`.
  9. Open DevTools → Application → Cookies: confirm `duo_session` cookie is present + httpOnly.
  10. Reload `/discover`. Profile should still be there (server hydration).
  11. Navigate to `/profile` → tap Sign out → land on `/`. Reload. Should still be on `/` with no profile (cookie cleared).

- [ ] Emit COMPLETE:

```
COMPLETE: Agent A
Tasks: 11/11 completed
Files changed:
 - src/lib/use-profile-storage.ts (rewrite)
 - src/lib/use-profile.ts (extended)
 - src/lib/auth-otp.ts (new)
 - src/app/auth/sign-up/page.tsx (rewired)
 - src/app/auth/sign-in/page.tsx (new)
 - src/app/page.tsx (handlers wired)
 - src/app/onboarding/verify-email/page.tsx (rewired)
 - src/app/onboarding/verify-phone/page.tsx (rewired)
 - src/app/onboarding/complete/page.tsx (write-through)
 - src/app/profile/page.tsx + src/app/settings/account/page.tsx (sign-out wired)
 - tests/lib/use-profile-storage.test.ts (new)
 - tests/lib/auth-otp.test.ts (new)
Issues: [none, or list]
Verification: typecheck + lint + vitest + production build + end-to-end smoke walk all pass.
```

## BLOCKER format

After 2 failed attempts at any single step, stop and emit:

```
BLOCKER: Agent A
Task: [task ID like A.7]
Error: [error message]
Attempted: [what you tried, twice]
Need: [what would unblock you — e.g. "/check-otp returns 500; need backend log access"
       or "api-client.ts doesn't set credentials: 'include'"]
```

## Logging format (write to `logs/phase-w-agent-a.md`)

Append to the file before AND after each task:

```markdown
## [HH:MM] Task A.N — [description]

- Status: started | completed | blocked
- Files: [created/modified paths]
- Notes: [decisions, observations]
- Errors: [resolved errors or "none"]
```

---

## Wave 1 Foundation — files now live

_This section is filled in by the orchestrator AFTER Foundation §5 completes and BEFORE you are dispatched. If you see "TO BE FILLED" anywhere below, BLOCKER._

### Backend production URLs (Foundation F.2 deliverables)

- API base URL: TO BE FILLED (expected: `https://api.ahavah.app`)
- API health check: TO BE FILLED (expected: `https://api.ahavah.app/health` → 200)
- WebSocket chat URL (for reference; Agent D uses): TO BE FILLED (expected: `wss://chat.ahavah.app:5443`)

### Frontend env var (set in `.env.local` before you start)

```
NEXT_PUBLIC_API_BASE_URL=https://api.ahavah.app
```

### API client surface (Foundation F.3 — read-only for you)

The orchestrator has shipped `src/lib/api-client.ts` exporting:

```typescript
export const apiClient: {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
};
export class ApiError extends Error {
  status: number;
  body: unknown;
}
```

Sets `credentials: 'include'` by default so the `duo_session` httpOnly cookie travels on every request. Reads `process.env.NEXT_PUBLIC_API_BASE_URL` as the base.

### Endpoints you'll use

| Method | Path | Purpose | Request body | Response |
|---|---|---|---|---|
| POST | `/request-otp` | Request signup/login OTP via email | `{ email: string }` | `{ ok: true }` (200) |
| POST | `/check-otp` | Verify OTP, start session | `{ email: string, otp: string }` | `{ session_token: string, is_new_account: boolean }` (200; sets `Set-Cookie`) |
| POST | `/sign-out` | End session | `{}` | `{ ok: true }` (200; clears cookie) |
| GET | `/me` | Read current profile | none | `Partial<Profile>` (200) or 401 if no session |
| PATCH | `/profile-info` | Update profile fields | `Partial<Profile>` | `{ ok: true }` (200) |
| GET | `/check-session-token` | Validate session exists | none | `{ valid: boolean }` |

### Seed account for testing

The orchestrator has created seed account `agent-a-test@ahavah.app` with verified OTP flow. Use it for end-to-end smoke walks. Email arrives at the Resend test inbox (path: TO BE FILLED).

### Storage keys (orchestrator-owned constants)

The orchestrator's `src/lib/storage-keys.ts` exports:

```typescript
export const PROFILE_CACHE_KEY = "ahavah.profile.v1";
export const DECISIONS_CACHE_KEY = "ahavah.decisions.v1";
export const FILTERS_CACHE_KEY = "ahavah.filters.v1";
export const PENDING_EMAIL_KEY = "ahavah.pending-email";
```

Use these constants — don't hardcode strings.

---

**Begin Task A.1 when ready. Log first, then work.**
