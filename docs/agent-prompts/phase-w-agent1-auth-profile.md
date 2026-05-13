# Phase W — Agent 1: Auth + Profile wiring

> **Trigger phrase**: This agent waits for the user to type **`You are Agent 1, execute`** in the terminal. Do not begin Task 1.0 / 1.1 until that phrase appears. Read the entire brief, confirm you understand your file ownership, then wait.

_Self-contained dispatch prompt. Copy the entire contents of this file into the Agent tool as the `prompt` parameter, `subagent_type: "general-purpose"`, `run_in_background: true`._

---

You are **Phase W Agent 1 — Auth + Profile** for the Ahavah PWA.

**Worktree:** `d:/Antigravity/ahavah-web-phase-w-1` (branch: `phase-w-agent-1`)
**Project root referenced in code:** `d:/Antigravity/ahavah-web` (use the worktree path when editing; the imports + structure are identical).
**Logging file:** `d:/Antigravity/ahavah-web-phase-w-1/logs/agent-1-auth-profile.md`

## Mission

Replace every localStorage read/write of the user profile + auth state with real HTTP calls to the backend at `http://167.71.93.27:5000` (plain HTTP; no SSL yet because the `ahavah.app` domain isn't registered). Wire the signup → email-OTP → onboarding pipeline end-to-end against the real backend so a fresh visitor can register, verify, complete onboarding, and have a persistent server-backed profile.

## BEFORE YOU WRITE ANY CODE — READ IN ORDER

1. **The master plan** — `d:/Antigravity/ahavah-web/docs/phase-w-plan.md` — sections 2 (outcome), 4 (workstream), 6 (file ownership). 5-min read; gives you context for why your scope ends where it ends.
2. **The quad-agent protocol** — `d:/Antigravity/loprofile-backend-v2/docs/quad-agent-protocol.md` — sections on Logging, Blocker, Completion. 3-min read; sets the communication contract.
3. **The current `useProfile` hook** — `d:/Antigravity/ahavah-web-phase-w-1/src/lib/use-profile.ts` (entire file, ~60 lines) and `d:/Antigravity/ahavah-web-phase-w-1/src/lib/use-profile-storage.ts` (entire file, ~25 lines).
4. **The Profile schema** — `d:/Antigravity/ahavah-web-phase-w-1/src/lib/profile-schema.ts` (it's long; read the top 100 lines + the `Profile` type at the bottom).
5. **The shared API client** (orchestrator-built, read-only for you) — `d:/Antigravity/ahavah-web-phase-w-1/src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/storage-keys.ts`. These exist when you start.
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
- `src/lib/discover-engine.ts`, `src/lib/profile-sample.ts` — Agent 2's domain in practice; preserve unchanged
- `src/lib/photo-storage.ts` — Agent 3's domain
- `src/lib/chat-client.ts` (when it exists) — Agent 4's domain

## Tasks

Execute these tasks IN ORDER. Each task is one focused commit. Log before AND after each task in `logs/agent-1-auth-profile.md`.

### Task 1.1 — Cache layer + storage rewrite (~30 min)

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
- [ ] Commit: `feat(phase-w-agent-1): use-profile-storage becomes cache, backend is source of truth`.

### Task 1.2 — `useProfile` extends with HTTP source-of-truth (~45 min)

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
- [ ] Commit: `feat(phase-w-agent-1): useProfile hydrates from backend with cache + write-through`.

### Task 1.3 — `auth-otp.ts` helper module + tests (~30 min)

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
- [ ] Commit: `feat(phase-w-agent-1): auth-otp helpers (request + check)`.

### Task 1.4 — Welcome page wires real handlers (~20 min)

**Goal:** `/` (welcome page) "Get started" and "Sign in" buttons navigate to the real signup / signin flows.

**Steps:**

- [ ] Read `src/app/page.tsx` to see what it currently does.
- [ ] Update the two CTA buttons to navigate to `/auth/sign-up` and `/auth/sign-in` respectively (use `next/link` `<Link>` — these are non-async navigations). If they already do this, no change needed; verify by reading.
- [ ] Smoke-walk: `pnpm dev`, open `http://localhost:3000`, tap each button, confirm correct destination.
- [ ] Commit if changed: `feat(phase-w-agent-1): welcome page CTAs route to real signup/signin`.

### Task 1.5 — `/auth/sign-up` calls real backend (~45 min)

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
- [ ] Commit: `feat(phase-w-agent-1): /auth/sign-up requests real OTP`.

### Task 1.6 — `/auth/sign-in` page (~30 min)

**Goal:** returning users hit `/auth/sign-in`, enter their email, get an OTP, complete the same flow.

**Steps:**

- [ ] Create `src/app/auth/sign-in/page.tsx` mirroring sign-up but with single email field, no password, copy: heading "Welcome back" + "Enter your email and we'll send a sign-in code." + CTA "Send code".
- [ ] Same handler: `await requestEmailOtp(email); sessionStorage.setItem("ahavah.pending-email", email); router.push("/onboarding/verify-email");`.
- [ ] Smoke-walk parallel to 1.5.
- [ ] Commit: `feat(phase-w-agent-1): /auth/sign-in page for returning users`.

### Task 1.7 — `/onboarding/verify-email` wires real OTP check (~45 min)

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
- [ ] Commit: `feat(phase-w-agent-1): /onboarding/verify-email validates OTP and starts session`.

### Task 1.8 — `/onboarding/verify-phone` parallel wiring (~30 min)

The backend OTP flow is the same shape for phone (different field name; the backend accepts either). Mirror 1.7 but with phone field + `requestPhoneOtp` (you'll need to add a sibling helper to `auth-otp.ts` calling `/request-otp` with a `phone` field instead of `email`).

- [ ] Add `requestPhoneOtp(phone: string)` and `checkPhoneOtp(phone: string, otp: string)` to `auth-otp.ts` + tests.
- [ ] Wire the page handler.
- [ ] Commit: `feat(phase-w-agent-1): /onboarding/verify-phone validates OTP via SMS`.

### Task 1.9 — `/onboarding/complete` write-through (~20 min)

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

- [ ] Commit: `feat(phase-w-agent-1): /onboarding/complete confirms server profile before launch`.

### Task 1.10 — Sign-out wiring on /profile + /settings/account (~20 min)

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
- [ ] Commit: `feat(phase-w-agent-1): real sign-out wiring`.

### Task 1.11 — Final verification (~30 min)

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
COMPLETE: Agent 1
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
BLOCKER: Agent 1
Task: [task ID like 1.7]
Error: [error message]
Attempted: [what you tried, twice]
Need: [what would unblock you — e.g. "/check-otp returns 500; need backend log access"
       or "api-client.ts doesn't set credentials: 'include'"]
```

## Logging format (write to `logs/agent-1-auth-profile.md`)

Append to the file before AND after each task:

```markdown
## [HH:MM] Task 1.N — [description]

- Status: started | completed | blocked
- Files: [created/modified paths]
- Notes: [decisions, observations]
- Errors: [resolved errors or "none"]
```

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

`d:/Antigravity/ahavah-web/logs/agent-1-auth-profile.md` on the master
repo (NOT inside your worktree). The `logs/` directory was created
by Agent 0 during F.5. Append-only; one entry per major step
(started + completed).

### Communication protocol (reminder)

When you hit a 2-attempt failure → emit a `BLOCKER:` block (template
in the brief above). When you finish all tasks → emit a `COMPLETE:`
block. Both go to **stdout in this terminal**; the user copy-pastes
them into Agent 0's IDE session for triage / acknowledgement. Agent 0
cannot see your terminal output directly.

---

**Begin Task 1.1 when ready. Log first, then work.**
