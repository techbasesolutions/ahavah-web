# Phase W — Agent C: Photos pipeline

_Self-contained dispatch prompt. Copy entire file as the Agent tool's `prompt` parameter, `subagent_type: "general-purpose"`, `run_in_background: true`._

---

You are **Phase W Agent C — Photos** for the Ahavah PWA.

**Worktree:** `d:/Antigravity/ahavah-web-phase-w-c` (branch: `phase-w-agent-c`)
**Logging file:** `d:/Antigravity/ahavah-web-phase-w-c/logs/phase-w-agent-c.md`

## Mission

Replace the localStorage base64 photo pipeline with real backend uploads. Photos:

1. Upload to the backend as multipart/form-data
2. Get classified by the backend's NSFW pipeline (210MB ONNX classifier — already wired backend-side; thresholds: `<0.40` approve, `0.40–0.75` manual review, `≥0.75` reject)
3. Return real CDN URLs (DO Spaces in production)
4. Render via real URLs across the app — `/profile`, `/discover`, `/profile/[uuid]`, MapAvatar all reference URLs not base64 data

Surface the moderation states (`uploading` / `pending-review` / `approved` / `rejected`) in the UI so users understand why a photo isn't visible yet.

## BEFORE YOU WRITE ANY CODE — READ IN ORDER

1. **Master plan** — `d:/Antigravity/ahavah-web/docs/phase-w-plan.md` sections 2, 4, 6.
2. **Quad-agent protocol** — `d:/Antigravity/loprofile-backend-v2/docs/quad-agent-protocol.md`.
3. **Current photo storage** — `d:/Antigravity/ahavah-web-phase-w-c/src/lib/photo-storage.ts` (whole file).
4. **Current photo helpers** — `src/lib/photo-or-gradient.ts`, `src/lib/image-compress.ts`, `src/components/app/photo-slot.tsx`.
5. **Onboarding photos page** — `src/app/onboarding/photos/page.tsx`.
6. **Profile-edit photo section** — `src/components/profile-edit/section-photos.tsx`.
7. **Shared API client** — `src/lib/api-client.ts`, `api-types.ts`, `storage-keys.ts`. If missing → BLOCKER.
8. **Backend photo endpoint signatures** — `d:/Antigravity/ahavah-api/service/api/__init__.py` lines 477–501. Note: the existing endpoint is `POST /verification-selfie` for verification; for profile photos there's a different endpoint (confirm in Foundation block).
9. **Backend photo moderation** — `d:/Antigravity/ahavah-api/service/photo_moderation/__init__.py` lines 1–80 — understand the verdict shape.
10. **Backend photo schema** — `d:/Antigravity/ahavah-api/database/init-api.sql` line 405 (`photo` table — fields: `uuid`, `nsfw_score`, `created_at`, `position`, `cdn_url`).

## Hard rules (non-negotiable)

- **No base64 in localStorage after Phase W.** The current 4MB quota cap goes away — backend enforces its own quota.
- **Image compression stays client-side** — keep `image-compress.ts` (Canvas resize to 1080×1440, JPEG quality 0.85) so we don't ship 12MP camera images over mobile networks. Compress THEN upload.
- **Multipart upload, not base64-in-JSON.** Use `FormData` and `apiClient.post` with the multipart variant. If `api-client.ts` doesn't expose multipart, BLOCKER (orchestrator-owned file).
- **Show progress.** Long uploads on slow networks need a progress indicator. `XMLHttpRequest.upload.onprogress` is the only way to get progress in browsers; native `fetch` doesn't expose it. The api-client may need a `postMultipart(path, formData, { onProgress })` method — if it doesn't, BLOCKER.
- **Moderation states in UI.** PhotoSlot already has `empty` / `loading` / `filled` / `error` per cva variants. Add `pending-review` and `rejected` variants if missing.
- **Optimistic preview.** Show the user's locally-compressed image immediately (object URL); replace with the CDN URL once the upload succeeds.
- **Quota fetched from server.** Replace the hardcoded 4MB local check with `GET /photos/quota` returning `{ used: number, limit: number, max_photos: number }`.
- **No new HTTP library.**
- **No em-dashes in user-facing copy.**
- **TDD on pure logic** — image compression + quota math get vitest tests. UI states get smoke walks.
- **One commit per task. Sign with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.**
- **Don't push, don't merge.** Orchestrator handles merge.

## File ownership

### Write (exclusively yours)

- `src/lib/photo-storage.ts` — full rewrite (becomes a thin wrapper over the backend photos endpoints)
- `src/lib/use-photo-upload.ts` — NEW (hook for one upload with progress + moderation feedback)
- `src/lib/use-photo-quota.ts` — NEW (hook for quota state)
- `src/lib/photo-types.ts` — NEW (shared types: `PhotoRecord`, `ModerationState`, `UploadResult`)
- `src/components/app/photo-slot.tsx` — extend cva with `pending-review` + `rejected` variants
- `src/app/onboarding/photos/page.tsx` — rewire to upload pipeline
- `src/components/profile-edit/section-photos.tsx` — same pipeline; add reorder + delete
- `src/lib/photo-or-gradient.ts` — extend to read `PhotoRecord[]` (URLs) not base64 strings
- `tests/lib/photo-storage.test.ts` — NEW (mock api-client)
- `tests/lib/use-photo-upload.test.ts` — NEW

### Read-only

- `src/lib/api-client.ts`, `api-types.ts`, `storage-keys.ts` — orchestrator-owned
- `src/lib/profile-schema.ts` — locked; if `Profile.photos` shape changes, BLOCKER
- `src/lib/image-compress.ts` — keep as-is (pure client-side)
- `src/components/ui/*`, `src/components/kibo-ui/*` — primitives
- All other app pages

## Tasks

Execute IN ORDER. One commit per task. Log before AND after.

### Task C.1 — Shared photo types (~15 min)

- [ ] Create `src/lib/photo-types.ts`:

```typescript
export type ModerationState =
  | "approved"
  | "pending-review"
  | "rejected"
  | "uploading";

export type PhotoRecord = {
  uuid: string;
  cdn_url: string;
  position: number;
  moderation_state: ModerationState;
  /** Server-side NSFW score; null while pending. Surfaced for diagnostics. */
  nsfw_score: number | null;
  created_at: string;
};

export type UploadProgress = {
  loadedBytes: number;
  totalBytes: number;
};

export type UploadResult = {
  photo: PhotoRecord;
};

export type QuotaInfo = {
  usedBytes: number;
  limitBytes: number;
  maxPhotos: number;
  currentPhotoCount: number;
};
```

- [ ] Commit: `feat(phase-w-c): photo-types module with moderation states + quota shape`.

### Task C.2 — Rewrite `photo-storage.ts` as backend wrapper (~45 min)

- [ ] Rewrite (replacing the localStorage 4MB check entirely):

```typescript
import { apiClient } from "@/lib/api-client";
import type { PhotoRecord, QuotaInfo, UploadProgress, UploadResult } from "./photo-types";

/**
 * Post-Phase W: photos live on the backend. localStorage is no longer involved.
 * Quota is enforced server-side; this module is a thin typed wrapper.
 */

export async function listPhotos(): Promise<PhotoRecord[]> {
  return apiClient.get<PhotoRecord[]>("/photos");
}

export async function getQuota(): Promise<QuotaInfo> {
  return apiClient.get<QuotaInfo>("/photos/quota");
}

export async function uploadPhoto(
  blob: Blob,
  options?: {
    position?: number;
    onProgress?: (p: UploadProgress) => void;
  },
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("photo", blob, "photo.jpg");
  if (options?.position !== undefined) {
    formData.append("position", String(options.position));
  }
  return apiClient.postMultipart<UploadResult>("/photos", formData, {
    onProgress: options?.onProgress,
  });
}

export async function deletePhoto(uuid: string): Promise<void> {
  await apiClient.delete(`/photos/${uuid}`);
}

export async function reorderPhotos(uuids: ReadonlyArray<string>): Promise<void> {
  await apiClient.post("/photos/reorder", { order: uuids });
}
```

- [ ] **Crucial:** if `apiClient.postMultipart` doesn't exist, BLOCKER. The orchestrator extends `api-client.ts`.
- [ ] Write `tests/lib/photo-storage.test.ts` mocking api-client; cases: `listPhotos`, `getQuota`, `uploadPhoto` (assert FormData has correct fields), `deletePhoto`, `reorderPhotos`.
- [ ] Run vitest — all pass.
- [ ] Commit: `feat(phase-w-c): photo-storage rewritten as backend wrapper`.

### Task C.3 — `use-photo-upload` hook + tests (~45 min)

**Goal:** stateful hook for ONE photo upload — handles compression, optimistic preview, progress, moderation feedback.

- [ ] Create `src/lib/use-photo-upload.ts`:

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import { uploadPhoto } from "./photo-storage";
import { compressImage } from "./image-compress";
import type { ModerationState, PhotoRecord, UploadProgress } from "./photo-types";

export type UploadState =
  | { kind: "idle" }
  | { kind: "compressing"; previewUrl: string }
  | { kind: "uploading"; previewUrl: string; progress: UploadProgress }
  | { kind: "moderating"; previewUrl: string; photo: PhotoRecord }
  | { kind: "ready"; photo: PhotoRecord }
  | { kind: "rejected"; reason: "nsfw" | "size" | "format" | "unknown"; previewUrl: string }
  | { kind: "error"; message: string; previewUrl: string };

export function usePhotoUpload(position: number) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      if (state.kind !== "idle" && state.kind !== "ready" && "previewUrl" in state) {
        URL.revokeObjectURL(state.previewUrl);
      }
    };
  }, [state]);

  const start = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      setState({ kind: "compressing", previewUrl });
      try {
        const compressedBlob = await compressImage(file, {
          maxWidth: 1080,
          maxHeight: 1440,
          quality: 0.85,
        });
        setState({ kind: "uploading", previewUrl, progress: { loadedBytes: 0, totalBytes: compressedBlob.size } });
        const result = await uploadPhoto(compressedBlob, {
          position,
          onProgress: (progress) => {
            setState((prev) => prev.kind === "uploading" ? { ...prev, progress } : prev);
          },
        });
        const photo = result.photo;
        if (photo.moderation_state === "approved") {
          setState({ kind: "ready", photo });
        } else if (photo.moderation_state === "pending-review") {
          setState({ kind: "moderating", previewUrl, photo });
        } else {
          setState({ kind: "rejected", reason: "nsfw", previewUrl });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setState({ kind: "error", message, previewUrl });
      }
    },
    [position],
  );

  const reset = useCallback(() => {
    if (state.kind !== "idle" && "previewUrl" in state) {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState({ kind: "idle" });
  }, [state]);

  return { state, start, reset };
}
```

- [ ] Write tests for the state machine: idle → compressing → uploading → moderating | ready; idle → compressing → uploading → rejected; idle → compressing → uploading → error. Mock `uploadPhoto`.
- [ ] Commit: `feat(phase-w-c): use-photo-upload hook with compression + progress + moderation`.

### Task C.4 — `use-photo-quota` hook (~20 min)

- [ ] Create `src/lib/use-photo-quota.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { getQuota } from "./photo-storage";
import type { QuotaInfo } from "./photo-types";

export function usePhotoQuota() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setQuota(await getQuota());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { quota, loading, refresh };
}
```

- [ ] Commit: `feat(phase-w-c): use-photo-quota hook`.

### Task C.5 — Extend PhotoSlot cva with moderation variants (~30 min)

- [ ] Read `src/components/app/photo-slot.tsx`. Note existing variants: `empty | loading | filled | error`.
- [ ] Add `pending-review` and `rejected` variants. Visual:
  - `pending-review`: filled image at 70% opacity + small amber pill "Reviewing" centered
  - `rejected`: empty slate + pink border + small caption "Photo declined"
- [ ] Surface a callable to clear `rejected` so the user can tap to re-upload.
- [ ] Update internal Story / preview test page if any.
- [ ] Smoke-walk: temporarily render all 6 variants on a sandbox page; confirm each looks distinct.
- [ ] Commit: `feat(phase-w-c): PhotoSlot adds pending-review + rejected cva variants`.

### Task C.6 — Rewire `/onboarding/photos` (~60 min)

- [ ] Open `src/app/onboarding/photos/page.tsx`.
- [ ] Replace its current localStorage logic with: `useProfile()` for the canonical photo list (server-backed, hydrated from `/me` which returns `photos: PhotoRecord[]`); per-slot `usePhotoUpload(position)`; `usePhotoQuota()` for the count cap.
- [ ] Each slot's onChange (file picker) → `start(file)`. The slot reads its visual state from the upload hook's `state.kind` AND the profile's photo at that position.
- [ ] On `kind: "ready"` for a slot, call `useProfile().refreshProfile()` so the new photo flows back through the central source of truth.
- [ ] If `kind: "rejected"`, surface a toast and reset the slot.
- [ ] Disable "Continue" button when no slot is `ready` (existing isComplete gate).
- [ ] Commit: `feat(phase-w-c): /onboarding/photos uses real upload pipeline`.

### Task C.7 — Same wiring on `/profile/edit/section-photos` (~30 min)

- [ ] Open `src/components/profile-edit/section-photos.tsx`.
- [ ] Mirror the C.6 pattern. Add reorder (drag-to-reorder if existing primitive available; otherwise up/down arrows on each slot) + delete (long-press or trash icon).
- [ ] Reorder calls `reorderPhotos(uuids)`; delete calls `deletePhoto(uuid)`. Both followed by `refreshProfile()`.
- [ ] Commit: `feat(phase-w-c): /profile/edit photos use real upload + reorder + delete`.

### Task C.8 — Extend `photo-or-gradient.ts` to read URLs (~15 min)

- [ ] Open `src/lib/photo-or-gradient.ts`. Today it returns `{ kind: "photo", src: string } | { kind: "gradient", css: string }` from base64 strings.
- [ ] Update to read from `Profile.photos: PhotoRecord[]` instead of `string[]`. The shape change cascades — `Profile.photos` field type changes from `string[]` to `PhotoRecord[]`.
- [ ] **WAIT** — that's a `profile-schema.ts` change, which is locked for you. **BLOCKER if needed**: the orchestrator must update `Profile.photos` type from `string[]` to `PhotoRecord[]` in Foundation F.3.
- [ ] If schema is already updated (verify by reading `src/lib/profile-schema.ts`), proceed: `photo-or-gradient.ts` returns `{ kind: "photo", src: photo.cdn_url }` for the indexed photo.
- [ ] Commit: `feat(phase-w-c): photo-or-gradient reads PhotoRecord[] CDN URLs`.

### Task C.9 — Final verification (~30 min)

- [ ] `pnpm exec tsc --noEmit` clean.
- [ ] `pnpm exec eslint --max-warnings=0` clean on touched files.
- [ ] `pnpm exec vitest run` — baseline + your new tests pass.
- [ ] `pnpm build` clean.
- [ ] **End-to-end smoke walk:**
  1. Sign in with a seed account.
  2. Navigate to `/profile/edit` → photos section.
  3. Upload a clean test photo. Watch the slot transition: `compressing` → `uploading` (with progress bar visible) → `ready`.
  4. Confirm the slot now shows the photo loaded from the CDN URL (DevTools Network → image request to `https://ahavah-photos-prod.nyc3.digitaloceanspaces.com/...` or similar).
  5. Sign in as a DIFFERENT seed account. Navigate to `/discover`. The first account should be a candidate; their newly-uploaded photo should appear on the SwipeCard (Agent B's surface, but C makes the URL real).
  6. Try uploading a deliberately too-large file (>10MB). Should be compressed client-side; backend should accept the compressed version.
  7. Try uploading an obviously-NSFW test image (orchestrator has an `agent-c-nsfw-test.jpg` available — see Foundation block). Should land in `rejected` state with the "Photo declined" UI.
  8. Reorder photos, delete one. Refresh page; order persists.
  9. Reduce-motion mode on. All visual states still readable; no animation jank.

- [ ] Emit COMPLETE:

```
COMPLETE: Agent C
Tasks: 9/9 completed
Files changed:
 - src/lib/photo-types.ts (new)
 - src/lib/photo-storage.ts (rewrite)
 - src/lib/use-photo-upload.ts (new)
 - src/lib/use-photo-quota.ts (new)
 - src/lib/photo-or-gradient.ts (URL-aware)
 - src/components/app/photo-slot.tsx (cva extended)
 - src/app/onboarding/photos/page.tsx (rewired)
 - src/components/profile-edit/section-photos.tsx (rewired + reorder + delete)
 - tests/lib/photo-storage.test.ts (new)
 - tests/lib/use-photo-upload.test.ts (new)
Issues: [or none]
Verification: typecheck + lint + vitest + build + e2e smoke walk all pass.
```

## BLOCKER format

```
BLOCKER: Agent C
Task: [task ID like C.2]
Error: [error]
Attempted: [what you tried twice]
Need: [what would unblock — usually a backend endpoint shape or api-client extension]
```

## Logging format (`logs/phase-w-agent-c.md`)

Same shape — timestamped before/after each task.

---

## Wave 1 Foundation — files now live

_Filled by orchestrator before dispatch. If you see "TO BE FILLED", BLOCKER._

### Endpoints you'll use

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/photos` | List current user's photos | none | `PhotoRecord[]` |
| GET | `/photos/quota` | Quota state | none | `QuotaInfo` |
| POST | `/photos` (multipart) | Upload one photo | FormData (`photo`, `position`) | `{ photo: PhotoRecord }` |
| DELETE | `/photos/<uuid>` | Delete one photo | none | 204 |
| POST | `/photos/reorder` | Reorder | `{ order: string[] }` | `{ ok: true }` |

### `apiClient.postMultipart` API (orchestrator extension)

The orchestrator's Foundation F.3 added:

```typescript
apiClient.postMultipart<T>(
  path: string,
  formData: FormData,
  options?: { onProgress?: (p: { loadedBytes: number; totalBytes: number }) => void },
): Promise<T>;
```

Implemented via `XMLHttpRequest` (only way to get upload progress in browsers).

### Profile.photos schema change

Foundation F.3 also updated `src/lib/profile-schema.ts` so `Profile.photos` is `PhotoRecord[]` (was `string[]`). Confirm by reading the schema before starting; if it's still `string[]`, BLOCKER.

### NSFW test asset

`d:/Antigravity/ahavah-web-phase-w-c/test-assets/agent-c-nsfw-test.jpg` (gitignored) — a stock benign-but-borderline image the moderator typically classifies as `pending-review` or `rejected` for end-to-end smoke testing. Use it in the C.9 smoke walk.

### CDN base URL

Photos served from `https://ahavah-photos-prod.nyc3.cdn.digitaloceanspaces.com/<uuid>.jpg` per Foundation F.2.

---

**Begin Task C.1 when ready. Log first, then work.**
