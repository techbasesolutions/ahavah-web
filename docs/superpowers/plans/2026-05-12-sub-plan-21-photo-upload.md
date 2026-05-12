# Sub-plan 21 — Photo upload MVP (frontend-only, base64 in localStorage)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a frontend-only photo upload pipeline. Users select up to 6 photos via native file picker; photos get aggressively client-compressed to fit localStorage (~5MB quota); the viewer's own photos render on every surface that currently uses gradient placeholders. SAMPLE_PROFILES stay on gradients (sample photos out of MVP scope; backend will seed later). Gradient fallback preserved everywhere — when `photos[i]` is missing, the existing `gradientsFor(uuid)` stamp renders.

**Architecture:** Pure helpers for image compression (canvas resize + JPEG encode) and photo-or-gradient resolution. New `<PhotoSlot>` primitive (cva variants for empty / loading / filled / error states). `Profile.photos?: string[]` field added to schema. `/onboarding/photos` and `/profile/edit` consume the slot; 6 consumer surfaces (discover / matches / map / match / chat / profile-view) gain a 2-line edit to read `photoOrGradient(profile)` instead of always-gradient. localStorage quota guard rejects uploads if total would exceed 4MB.

**Tech Stack:** Existing Next.js 16 + React 19 + Tailwind v4 + Lucide. No new deps. Canvas + FileReader + URL.createObjectURL — native browser APIs. Tests via vitest.

---

## Context

User direction: "Real photo upload (still gradient stamps everywhere) — Tier-4 backend prep" — proceeding under the Tier-4 fence (no backend wiring, no real upload-to-S3). For MVP, base64 in localStorage gives the user a working end-to-end demo: upload via /onboarding/photos → see their photo on /profile/edit → see it everywhere else.

SP20 §27 large finding L2 (/onboarding/photos lacks loading + error states for the placeholder stub) is CLOSED by this sub-plan — the upload flow inherently provides loading + error states.

Cross-references:
- §15 R5 four-state rubric (happy / loading / empty / error) applied to the new PhotoSlot primitive.
- SP19 sticker-and-paper aesthetic: paper-tape on slot 0, "Main" Pill matches /match badge tilt + lime drop-shadow.
- SP20 audit found motion-budget violations across onboarding; new photo grid stays within budget (50ms × 6 slots = 300ms total stagger cap).
- Frontend-design skill invoked BEFORE drafting (per SP15 T4 lesson and SP19 / SP20 pattern). Specific pixel sizes + colors + state semantics baked into this spec.

---

## Scope decisions locked

- **Storage:** `photos?: string[]` on Profile. Each entry is a `data:image/jpeg;base64,...` data URL. Future backend swap is a remote-URL substitution — same field, no shape change.
- **Slot count: 6.** Fixed slots. First non-empty slot is "Main" (renders on all consumer surfaces).
- **Reordering: NOT in MVP.** Fixed slot order. To change main, user removes slot 0 then re-adds.
- **Compression target:** canvas resize to fit within 1080×1440 (preserves 3:4 aspect when source is portrait), JPEG quality 0.85. Typical phone JPEG (~3MB original) compresses to ~250-400KB. 6 × 400KB = 2.4MB worst case — fits localStorage.
- **Per-file size cap (pre-compression):** 10MB. Files >10MB get error before compression even starts.
- **Storage quota guard:** before save, sum byte length of all photos. If > 4MB, reject upload with "Out of storage" error.
- **Accepted MIME:** `image/jpeg`, `image/png`, `image/webp`. HEIC (iOS native) NOT supported in MVP (browsers can't decode without a library). Document as a known limitation.
- **Removal:** tap X button on filled slot → immediate silent remove (no confirmation Dialog). User can re-add. Confirmation would be too aggressive for MVP given no backend / no real cost to removal.
- **No fullscreen preview.** Tap on filled slot (not the X) is a no-op for MVP. Future enhancement.
- **SAMPLE_PROFILES:** `photos` stays undefined → existing gradient fallback continues. Don't seed sample photos.
- **/onboarding/photos placeholder stub removed.** Wire to real upload via PhotoSlot.
- **/profile/edit photo section:** new dedicated section component using 6 PhotoSlots.

---

## File structure

| File | Role |
|---|---|
| `src/lib/image-compress.ts` | CREATE. Pure async helper. `compressImage(file: File, max: { width, height }, quality): Promise<{ dataUrl: string; bytes: number }>`. Uses canvas + JPEG encoding. |
| `tests/lib/image-compress.test.ts` | CREATE. ~3 cases — pure logic for the dimension math + a smoke test invoking the function in jsdom. (Note: jsdom canvas may need careful mock; if it can't run, mark integration-test-only.) |
| `src/lib/photo-or-gradient.ts` | CREATE. Pure helper `photoOrGradient(profile, slotIndex = 0): { kind: "photo"; src: string } \| { kind: "gradient"; css: string }`. Used by all 6 consumer surfaces. |
| `tests/lib/photo-or-gradient.test.ts` | CREATE. ~4 cases — empty photos → gradient, with photo[0] → that photo, with photos[2] requested but only 1 photo → gradient, mismatched slot index. |
| `src/lib/photo-storage.ts` | CREATE. Pure helpers — `estimateTotalBytes(photos: string[]): number`, `MAX_STORAGE_BYTES = 4 * 1024 * 1024`, `canAddPhoto(currentPhotos, newSize): { ok: true } \| { ok: false; reason: string }`. |
| `tests/lib/photo-storage.test.ts` | CREATE. ~3 cases — under quota / at quota / over quota. |
| `src/lib/profile-schema.ts` | MODIFY. Add `photos?: string[]` to Profile aggregate (NOT a MINIMUM_COMPLETE_FIELD — optional). |
| `src/components/app/photo-slot.tsx` | CREATE. `<PhotoSlot>` primitive with cva variants for `state: "empty" \| "loading" \| "filled" \| "error"`. Hidden file input triggered by click. Renders accordingly. ~150 lines. |
| `src/app/onboarding/photos/page.tsx` | MODIFY. Replace placeholder stub with real PhotoSlot grid + compression pipeline. |
| `src/components/profile-edit/section-photos.tsx` | CREATE. `<PhotoEditSection>` — 6-slot grid for /profile/edit. ~80 lines. |
| `src/app/profile/edit/page.tsx` | MODIFY. Mount PhotoEditSection. Verify the wizard-cluster ordering still works post-add. |
| Consumer surfaces (6 files, ~5 lines each): `src/app/profile/[uuid]/page.tsx`, `src/app/discover/page.tsx`, `src/app/matches/page.tsx`, `src/components/app/map-avatar.tsx`, `src/app/match/page.tsx`, `src/app/chat/[id]/page.tsx` | MODIFY. Each reads `photoOrGradient(profile)` instead of always-gradient. |
| `PROJECT-STATUS.md` | MODIFY. Append §28 closeout. |

No new dependencies. No new design tokens.

---

## Existing primitives reused

- `Pill` from kibo for "Main" indicator (variant="lime", size="sm")
- `Button` from kit for the X remove control (size="circle", tone="overlay", aria-label "Remove photo")
- `cva` for PhotoSlot variants
- `Loader2`, `Plus`, `X`, `AlertTriangle` from lucide-react
- `gradientsFor` from `@/lib/profile-gradients` (existing helper)
- `useProfile`'s `update` setter (existing)
- `motion/react` for slot mount cascade

---

## Hard rules

1. **Kit-only via cva.** PhotoSlot's 4 states are cva variants. No inline className overrides that break the kit.
2. **GPU-only motion.** Slot entrance: opacity + scale only. No layout-thrashing animations.
3. **prefers-reduced-motion respected.** Slot mount cascade collapses to instant under reduced-motion.
4. **44px tap targets.** Every interactive element (empty slot, X remove, Main pill area) ≥ 44px.
5. **Storage quota guard.** Reject uploads that would exceed 4MB total. User-friendly error message.
6. **Image compression aggressive.** 1080×1440 max, JPEG 0.85. Verify against a 3MB original phone photo → expect ~300-500KB output.
7. **SAMPLE_PROFILES untouched.** Don't seed sample photos. Gradients continue.
8. **Consumer-surface pattern uniform.** All 6 surfaces use the SAME helper signature `photoOrGradient(profile)`. No bespoke per-surface logic.
9. **HEIC limitation documented.** /onboarding/photos error message mentions JPEG / PNG / WebP only.
10. **§18 sign-off rule.** §28 closeout cites verification queries.
11. **Sticker-and-paper aesthetic.** Slot 0 has paper-tape (top-left, lavender, rotate-12) + Main pill (top-right, lime variant, -rotate-3, lime drop-shadow). Slots 1-5 have only the X remove button.

---

## Tasks

### T1 — Pure: `image-compress.ts` + tests

**Files:**
- Create: `src/lib/image-compress.ts`
- Create: `tests/lib/image-compress.test.ts`

**Steps:**

- [ ] Step 1: Implement `compressImage`:

  ```ts
  export interface CompressOptions {
    maxWidth: number;
    maxHeight: number;
    quality: number; // 0..1
  }

  export interface CompressResult {
    dataUrl: string;
    bytes: number;
    width: number;
    height: number;
  }

  /**
   * Compresses a File via canvas resize + JPEG encoding. Preserves aspect
   * ratio; resizes to fit within maxWidth × maxHeight. Output is a
   * data:image/jpeg;base64,... URL.
   *
   * Throws if the file isn't an image or can't be decoded.
   */
  export async function compressImage(
    file: File,
    opts: CompressOptions = { maxWidth: 1080, maxHeight: 1440, quality: 0.85 },
  ): Promise<CompressResult> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Not an image file.");
    }
    const img = await loadImage(file);
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, opts.maxWidth, opts.maxHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported.");
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", opts.quality);
    const bytes = base64Bytes(dataUrl);
    return { dataUrl, bytes, width, height };
  }

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not decode image."));
      };
      img.src = url;
    });
  }

  /**
   * Compute width/height that fits within (maxW, maxH) preserving aspect
   * ratio. Never enlarges — if source is smaller, returns source dims.
   */
  export function fitWithin(srcW: number, srcH: number, maxW: number, maxH: number): { width: number; height: number } {
    const scale = Math.min(1, maxW / srcW, maxH / srcH);
    return {
      width: Math.round(srcW * scale),
      height: Math.round(srcH * scale),
    };
  }

  /**
   * Approximate byte size of a base64 data URL. base64 encoding is
   * roughly 4/3 of binary, minus the "data:" prefix and any padding.
   */
  export function base64Bytes(dataUrl: string): number {
    const i = dataUrl.indexOf(",");
    if (i === -1) return dataUrl.length;
    const b64 = dataUrl.slice(i + 1);
    return Math.floor((b64.length * 3) / 4);
  }
  ```

- [ ] Step 2: Tests for the pure helpers (`fitWithin` + `base64Bytes`). `compressImage` itself requires DOM + canvas + Image — jsdom may not support these cleanly. Mock or skip per environment capability; document the skip in code.

  ~3-4 vitest cases on `fitWithin` (already-small → no resize; landscape source; portrait source) + ~2 cases on `base64Bytes` (typical data URL; raw base64).

- [ ] Step 3: Verify gates — tsc / eslint / vitest 274 + ~5 new = 279 passing.

### T2 — Pure: `photo-or-gradient.ts` + tests

**Files:**
- Create: `src/lib/photo-or-gradient.ts`
- Create: `tests/lib/photo-or-gradient.test.ts`

**Steps:**

- [ ] Step 1: Implement:

  ```ts
  import { gradientsFor } from "@/lib/profile-gradients";
  import type { Profile } from "@/lib/profile-schema";

  export type PhotoSource =
    | { kind: "photo"; src: string }
    | { kind: "gradient"; css: string };

  /**
   * Resolves a profile's photo at the requested slot. Falls back to the
   * deterministic gradient stamp if no photo is uploaded at that slot.
   * `seed` defaults to the profile's lowercased firstName so the same
   * profile always gets the same gradient across re-renders.
   */
  export function photoOrGradient(
    profile: Pick<Profile, "photos" | "firstName">,
    slotIndex = 0,
  ): PhotoSource {
    const uploaded = profile.photos?.[slotIndex];
    if (uploaded) return { kind: "photo", src: uploaded };
    const seed = profile.firstName?.toLowerCase() ?? "x";
    const gradients = gradientsFor(seed);
    const gradient = gradients[slotIndex % gradients.length];
    return { kind: "gradient", css: gradient };
  }
  ```

- [ ] Step 2: Tests:
  1. profile with no photos → gradient
  2. profile with photos[0] → photo
  3. profile with photos[0] but slotIndex=2 → gradient (slot empty)
  4. profile with photos[0] = empty string → gradient (treat empty as missing)

- [ ] Step 3: Verify gates — tsc / eslint / vitest 279 + 4 = 283.

### T3 — Pure: `photo-storage.ts` quota helpers + tests

**Files:**
- Create: `src/lib/photo-storage.ts`
- Create: `tests/lib/photo-storage.test.ts`

**Steps:**

- [ ] Step 1: Implement:

  ```ts
  export const MAX_STORAGE_BYTES = 4 * 1024 * 1024; // 4MB headroom under 5MB localStorage quota
  export const MAX_PHOTO_BYTES = 1 * 1024 * 1024;   // 1MB compressed cap per photo

  import { base64Bytes } from "@/lib/image-compress";

  export function estimateTotalBytes(photos: ReadonlyArray<string>): number {
    return photos.reduce((sum, p) => sum + base64Bytes(p), 0);
  }

  export type QuotaResult =
    | { ok: true }
    | { ok: false; reason: string };

  export function canAddPhoto(
    currentPhotos: ReadonlyArray<string>,
    newPhotoBytes: number,
  ): QuotaResult {
    if (newPhotoBytes > MAX_PHOTO_BYTES) {
      return { ok: false, reason: "This photo is too large after compression. Try a smaller image." };
    }
    const currentTotal = estimateTotalBytes(currentPhotos);
    if (currentTotal + newPhotoBytes > MAX_STORAGE_BYTES) {
      return { ok: false, reason: "Out of storage. Remove a photo to add a new one." };
    }
    return { ok: true };
  }
  ```

- [ ] Step 2: Tests — empty (allow), under quota (allow), at quota (reject), one big photo (reject), many small photos summing over quota (reject).

- [ ] Step 3: Verify gates — vitest 283 + 4 = 287.

### T4 — Schema field

**Files:**
- Modify: `src/lib/profile-schema.ts`

**Steps:**

- [ ] Step 1: Add `photos?: string[]` to the Profile aggregate type. Place near `displayName` / `bio` / other identity fields.
- [ ] Step 2: Do NOT add `photos` to `MINIMUM_COMPLETE_FIELDS`. Photos are optional for MVP (the wizard step is mandatory by route position but the field itself is soft-optional — user can skip with empty array).
- [ ] Step 3: Verify gates.

### T5 — `<PhotoSlot>` primitive

**Files:**
- Create: `src/components/app/photo-slot.tsx`

**Steps:**

- [ ] Step 1: Implement the component with cva variants for 4 states:

  ```tsx
  "use client";

  import { useRef, useState } from "react";
  import { cva, type VariantProps } from "class-variance-authority";
  import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
  import { motion, useReducedMotion } from "motion/react";

  import { Pill } from "@/components/kibo-ui/pill";
  import { cn } from "@/lib/utils";

  const slotVariants = cva(
    "relative aspect-3/4 w-full overflow-hidden rounded-2xl transition-colors",
    {
      variants: {
        state: {
          empty: "border-2 border-dashed border-white/15 bg-bg-elevated/50 hover:bg-bg-elevated/80 cursor-pointer",
          loading: "border-2 border-solid border-white/15 bg-bg-elevated/50",
          filled: "border-[3px] border-white shadow-2xl",
          error: "border-2 border-solid border-pink/40 bg-bg-elevated/50",
        },
      },
      defaultVariants: { state: "empty" },
    },
  );

  export interface PhotoSlotProps extends VariantProps<typeof slotVariants> {
    /** True for the slot at index 0 — gets paper-tape + Main pill. */
    isMain?: boolean;
    /** Existing photo dataURL or remote URL. */
    src?: string;
    /** Fired when the user picks a file. Compression + storage handled by parent. */
    onPick?: (file: File) => void;
    /** Fired when the X is tapped on a filled slot. */
    onRemove?: () => void;
    /** Error message for state="error". */
    errorMessage?: string;
    /** Entrance-animation index (for stagger). */
    index?: number;
    className?: string;
  }

  export function PhotoSlot({
    state = "empty",
    isMain = false,
    src,
    onPick,
    onRemove,
    errorMessage,
    index = 0,
    className,
  }: PhotoSlotProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const reduceMotion = useReducedMotion();

    const handleClick = () => {
      if (state === "empty" || state === "error") {
        inputRef.current?.click();
      }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onPick) onPick(file);
      // Reset so picking the same file twice fires onChange
      if (inputRef.current) inputRef.current.value = "";
    };

    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: reduceMotion ? 0 : index * 0.05 }}
        className={cn(slotVariants({ state }), className)}
      >
        {/* Empty state */}
        {state === "empty" && (
          <button
            type="button"
            onClick={handleClick}
            aria-label={`Add photo ${index + 1}`}
            className="absolute inset-0 flex items-center justify-center text-lavender hover:text-lavender/80 outline-none focus-visible:ring-2 focus-visible:ring-lavender"
          >
            <Plus className="size-8" aria-hidden />
          </button>
        )}

        {/* Loading state */}
        {state === "loading" && (
          <div
            aria-live="polite"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-lavender"
          >
            <Loader2 className="size-6 animate-spin" aria-hidden />
            <span className="text-caption text-text-muted">Uploading…</span>
          </div>
        )}

        {/* Filled state */}
        {state === "filled" && src && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Profile photo ${index + 1}${isMain ? " (main)" : ""}`}
              className="size-full object-cover"
            />
            {/* Slot 0: paper-tape (top-left) + Main pill (top-right) */}
            {isMain && (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-2 top-2 z-10 h-2 w-6 rotate-12 rounded-sm bg-lavender/70"
                />
                <div className="pointer-events-none absolute right-2 top-2 z-10 -rotate-3 shadow-[0_2px_8px_rgba(200,255,136,0.4)]">
                  <Pill variant="lime" size="sm">Main</Pill>
                </div>
              </>
            )}
            {/* Remove button (all filled slots; on slot 0 it sits below the Main pill) */}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove photo ${index + 1}`}
                className={cn(
                  "absolute z-20 flex size-tap items-center justify-center rounded-full bg-black/45 text-white outline-none focus-visible:ring-2 focus-visible:ring-pink",
                  isMain ? "bottom-2 right-2" : "top-2 right-2",
                )}
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </>
        )}

        {/* Error state */}
        {state === "error" && (
          <button
            type="button"
            onClick={handleClick}
            aria-label="Try again"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-pink outline-none focus-visible:ring-2 focus-visible:ring-pink"
          >
            <AlertTriangle className="size-6" aria-hidden />
            <span className="text-caption text-pink text-center">{errorMessage ?? "Couldn't upload"}</span>
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
          aria-hidden
          tabIndex={-1}
        />
      </motion.div>
    );
  }
  ```

- [ ] Step 2: Verify gates — tsc / eslint / vitest 287 (unchanged — no new tests for the React shell).

### T6 — `/onboarding/photos` integration

**Files:**
- Modify: `src/app/onboarding/photos/page.tsx`

**Steps:**

- [ ] Step 1: Read the existing placeholder-stub implementation. Strip the gradient cycling code. Replace with a real upload loop using PhotoSlot:

  ```tsx
  "use client";

  import { useState } from "react";
  import { motion } from "motion/react";

  import { OnboardingShell } from "@/components/app/onboarding-shell";
  import { PhotoSlot } from "@/components/app/photo-slot";
  import { compressImage } from "@/lib/image-compress";
  import { canAddPhoto } from "@/lib/photo-storage";
  import { useProfile } from "@/lib/use-profile";

  const SLOT_COUNT = 6;

  type SlotState = "empty" | "loading" | "filled" | "error";

  export default function PhotosStep() {
    const { profile, update } = useProfile();
    const photos = profile.photos ?? [];
    // Per-slot transient state (loading / error). Indexed 0..5.
    const [slotStates, setSlotStates] = useState<Record<number, { state: SlotState; error?: string }>>({});

    const hasMain = (photos[0] ?? "") !== "";
    const isComplete = hasMain;

    const handlePick = async (slotIndex: number, file: File) => {
      setSlotStates((s) => ({ ...s, [slotIndex]: { state: "loading" } }));
      try {
        const compressed = await compressImage(file);
        const quota = canAddPhoto(photos.filter((_, i) => i !== slotIndex), compressed.bytes);
        if (!quota.ok) {
          setSlotStates((s) => ({ ...s, [slotIndex]: { state: "error", error: quota.reason } }));
          return;
        }
        const nextPhotos = [...photos];
        nextPhotos[slotIndex] = compressed.dataUrl;
        // Compact: fill empty leading slots so main slot is always populated first
        const compacted = nextPhotos.filter(Boolean);
        update({ photos: compacted });
        setSlotStates((s) => ({ ...s, [slotIndex]: { state: "filled" } }));
      } catch (err) {
        setSlotStates((s) => ({
          ...s,
          [slotIndex]: {
            state: "error",
            error: err instanceof Error ? err.message : "Couldn't read this file.",
          },
        }));
      }
    };

    const handleRemove = (slotIndex: number) => {
      const next = [...photos];
      next.splice(slotIndex, 1);
      update({ photos: next });
      setSlotStates((s) => {
        const copy = { ...s };
        delete copy[slotIndex];
        return copy;
      });
    };

    return (
      <OnboardingShell href="/onboarding/photos" ctaDisabled={!isComplete}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-display text-white">
            Add your photos<span className="text-lime">.</span>
          </h1>
          <p className="text-body text-text-secondary">
            Pick at least one photo. Your first photo is your main — it shows up on Discover and Map.
          </p>
        </motion.div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {Array.from({ length: SLOT_COUNT }).map((_, i) => {
            const photo = photos[i];
            const localState = slotStates[i];
            const state: SlotState = localState?.state ?? (photo ? "filled" : "empty");
            return (
              <PhotoSlot
                key={i}
                index={i}
                isMain={i === 0}
                state={state}
                src={photo}
                errorMessage={localState?.error}
                onPick={(file) => handlePick(i, file)}
                onRemove={photo ? () => handleRemove(i) : undefined}
              />
            );
          })}
        </div>

        <p className="mt-4 text-caption text-text-secondary" aria-live="polite">
          {hasMain
            ? `${photos.length} of ${SLOT_COUNT} added. Your main photo is set.`
            : "At least one photo required."}
        </p>
        <p className="mt-1 text-caption text-text-muted">
          JPEG, PNG, or WebP up to 10MB each. Photos are compressed before saving.
        </p>
      </OnboardingShell>
    );
  }
  ```

- [ ] Step 2: Verify the file replaces the existing placeholder stub cleanly. Remove any unused imports from the previous version.

- [ ] Step 3: Verify gates. Build adds no new routes (overwriting existing /onboarding/photos).

### T7 — `/profile/edit` photo section

**Files:**
- Create: `src/components/profile-edit/section-photos.tsx`
- Modify: `src/app/profile/edit/page.tsx`

**Steps:**

- [ ] Step 1: Create `<PhotoEditSection>` that mirrors the onboarding page's logic but without the OnboardingShell + h1:

  ```tsx
  "use client";

  // Same slot management logic as /onboarding/photos but inside a
  // ProfileSection wrapper instead of OnboardingShell.
  // ... (similar implementation)
  ```

  Factor shared logic if it's clean; otherwise duplicate is fine for MVP (2 callers).

- [ ] Step 2: Add `<PhotoEditSection>` to `/profile/edit/page.tsx` in a natural position — probably at the TOP of the form (above Identity section), since photos are the headline of any profile.

- [ ] Step 3: Verify gates + smoke walk (visit /profile/edit, confirm 6-slot grid renders, upload a photo, confirm it persists across reload).

### T8 — Consumer surface wiring + closeout

**Files:**
- Modify: `src/app/profile/[uuid]/page.tsx` (photo carousel — slot 0)
- Modify: `src/app/discover/page.tsx` (swipe deck photo)
- Modify: `src/app/matches/page.tsx` (matches grid tile)
- Modify: `src/components/app/map-avatar.tsx` (Leaflet divIcon HTML — use photo if available)
- Modify: `src/app/match/page.tsx` (both celebration cards — self uses viewer's photo, matched uses subject's gradient since SAMPLE_PROFILES have no photos)
- Modify: `src/app/chat/[id]/page.tsx` (chat header avatar)
- Modify: `PROJECT-STATUS.md` (§28)

**Steps:**

- [ ] Step 1: For each consumer surface, import `photoOrGradient` and replace the existing `gradientsFor(...)` direct call with `const source = photoOrGradient(profile, 0)` + branch on `source.kind` for img vs gradient render.

- [ ] Step 2: For MapAvatar specifically: Leaflet divIcon HTML doesn't support React. Embed the photo as a `<img>` tag inside the HTML string with `object-fit: cover; border-radius: 50%`. If `kind === "gradient"`, use the existing gradient stamp HTML.

- [ ] Step 3: For /match: viewer's photo for the self card; matched candidate is SAMPLE_PROFILES so always gradient fallback. Don't break the existing /match polish (SP19) — verify the Main pill + paper-tape + confetti still work.

- [ ] Step 4: Smoke walk end-to-end:
  - Upload a photo via /onboarding/photos (or /profile/edit if already onboarded)
  - Navigate to /discover → see photo on swipe card
  - Navigate to /matches → see photo on grid tile
  - Navigate to /map → see photo as avatar marker (if viewer is in ACTIVE_CHAT_IDS — actually viewer isn't a sample, so verify it shows the TestViewer marker if showOnMap is true; if not, simulate by adding viewer as a sample temporarily)
  - Navigate to /match (with seeded match) → see photo on self card
  - Navigate to /profile/[TestViewer-id] → see photo in carousel
  - Navigate to /chat/adina → see photo as chat header avatar

- [ ] Step 5: Append PROJECT-STATUS §28. Anchor every claim to citable verification (grep / smoke step / commit SHA). Cross-reference SP20 L2 (photos R5 four-state) as CLOSED by this sub-plan.

- [ ] Step 6: Full verification gates — tsc / eslint / vitest 287 / build 48 routes.

- [ ] Step 7: Commit docs. Merge to master via `git merge --no-ff sub-plan-21-photo-upload`.

---

## Verification

Per-task:
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 274 + ~13 new = 287 passing
- Browser smoke walks for T5-T8

Whole-sub-plan (after T8):
- Tests ≥287 passing
- TypeCheck clean
- Lint clean
- Production build clean — 48 routes
- End-to-end smoke walk per T8 Step 4
- §28 anchored to verification queries per §18 rule
- `grep -n "photoOrGradient" src/app/ src/components/` returns 6+ consumers
- `grep -n "photos\?: string\[\]" src/lib/profile-schema.ts` returns the new field
- localStorage round-trip verified: upload → reload → photo persists

---

## Self-review notes

- **Spec coverage:** every gradient-rendering surface gets a real-photo path with gradient fallback.
- **Placeholder scan:** zero TBD. Every step has exact TS / JSX.
- **Type consistency:** `Profile.photos: string[]` simple shape; `PhotoSource` union for the helper; cva variants for slot states.
- **DRY:** `photoOrGradient` is the single source of truth for "do I have a real photo here?". 6 consumer surfaces use the same helper.
- **Scope fence:**
  - No backend.
  - No real upload to S3.
  - No image cropping UI (use natural aspect, object-cover on consumer surfaces).
  - No reordering UI (fixed slot order).
  - No fullscreen preview.
  - No SAMPLE_PROFILES seed photos.
  - HEIC not supported.
- **Failure-pattern guard:**
  - frontend-design skill invoked BEFORE drafting (encoded design direction in this spec).
  - Multi-skill discipline applied (accessibility on aria-labels + focus indicators; mobile-responsive on tap targets; ui-design-system on token compliance).
  - SDD per task with two-stage review.
  - §28 closure cites verifications per §18 rule.

---

## Execution

8 tasks. T1-T4 are pure logic / type changes with TDD. T5 is the primitive. T6-T7 are integrations. T8 is closeout + 6 small consumer-surface edits + merge.

Branch: `sub-plan-21-photo-upload`. Merge via `git merge --no-ff`.

---

## Deferred (not in SP21)

- **Real backend upload** (S3 + CDN) — Tier-4.
- **Image cropping UI** — future polish.
- **HEIC support** — needs a wasm-heic library; out of MVP.
- **Reordering slots** — future enhancement (drag-and-drop).
- **Fullscreen photo preview** (tap filled slot to view large) — future.
- **SAMPLE_PROFILES seed photos** — Tier-4 (would need real photo URLs + licensing). Stays on gradients.
- **Multi-file upload** (pick multiple at once) — future.
- **Photo verification badge** (auto-detect blurry / inappropriate / non-face) — Tier-4 with ML.
- **Carry-forward from SP20:** NumberStepper primitive, /onboarding/verification tier cards, axis-9 contrast sweep, motion-budget rubric reconciliation. All still queued.
- **Widened 12-axis audit + Legal pages** — still deferred.
