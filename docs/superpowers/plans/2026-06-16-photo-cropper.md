# Photo Cropper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pan + zoom to frame a square crop of their profile photo uploads, client-side, before the existing compress/upload pipeline runs.

**Architecture:** Insert a crop step between file-pick and `usePhotoUpload.start()`. A `PhotoCropper` modal (react-easy-crop, aspect 1:1) returns a square `Blob` via a canvas util `cropImageToBlob`; that Blob is wrapped as a `File` and fed to the unchanged `compressImage -> uploadPhoto` pipeline. No backend change.

**Tech Stack:** Next 16 / React 19 / Tailwind v4, `react-easy-crop`, canvas, vitest + jsdom.

Spec: `docs/superpowers/specs/2026-06-16-photo-cropper-design.md`

---

### Task 1: Add the react-easy-crop dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
cd d:/Antigravity/ahavah-web && pnpm add react-easy-crop
```

- [ ] **Step 2: Verify React 19 / Next 16 compat (no peer-dep error, type-resolves)**

Run: `npx tsc --noEmit 2>&1 | grep -i "react-easy-crop"` — Expected: no output.
If it errors on React 19 peer dep, pin a version that supports it (`react-easy-crop@^5`) and re-check.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml && git commit -m "deps: add react-easy-crop for photo cropping"
```

---

### Task 2: `cropImageToBlob` + `loadDisplayableSrc` (crop util, TDD)

**Files:**
- Create: `src/lib/crop-image.ts`
- Test: `tests/lib/crop-image.test.ts`

`croppedAreaPixels` is react-easy-crop's output: `{ x, y, width, height }` in source-image pixels.

- [ ] **Step 1: Write the failing test** (jsdom has no real canvas — mock it; assert the canvas is sized to the crop region and `drawImage` gets the region, which is the logic that matters)

```ts
// tests/lib/crop-image.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cropImageToBlob } from "@/lib/crop-image";

describe("cropImageToBlob", () => {
  beforeEach(() => {
    // Stub Image so onload fires with known natural dimensions.
    vi.stubGlobal("Image", class {
      onload: (() => void) | null = null;
      set src(_v: string) { queueMicrotask(() => this.onload?.()); }
      width = 1000; height = 800;
    });
  });

  it("sizes the output canvas to the crop region and draws that region", async () => {
    const drawImage = vi.fn();
    const toBlob = vi.fn((cb: (b: Blob) => void) =>
      cb(new Blob(["x"], { type: "image/jpeg" })));
    const canvas: Record<string, unknown> = { width: 0, height: 0,
      getContext: () => ({ drawImage }), toBlob };
    vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);

    const blob = await cropImageToBlob("blob:fake", { x: 100, y: 50, width: 400, height: 400 });

    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(400);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 100, 50, 400, 400, 0, 0, 400, 400);
    expect(blob.type).toBe("image/jpeg");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/crop-image.test.ts` — Expected: FAIL (`cropImageToBlob` not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/crop-image.ts
export type CropArea = { x: number; y: number; width: number; height: number };

/** Crop `src` (an image URL) to `area` (source-pixel rect) -> square JPEG Blob. */
export async function cropImageToBlob(src: string, area: CropArea): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Crop failed: empty canvas"))),
      "image/jpeg",
      0.92,
    ),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for cropping"));
    img.src = src;
  });
}

/** Return an object URL the cropper can display. HEIC/HEIF -> JPEG via heic2any
 *  (browsers can't render HEIC), so the cropper viewport always shows something.
 *  Caller must revokeObjectURL when done. */
export async function loadDisplayableSrc(file: File): Promise<string> {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const isHeic = type === "image/heic" || type === "image/heif" ||
    name.endsWith(".heic") || name.endsWith(".heif");
  if (!isHeic) return URL.createObjectURL(file);
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : out;
  return URL.createObjectURL(blob as Blob);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/crop-image.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crop-image.ts tests/lib/crop-image.test.ts && git commit -m "feat: crop-image util (cropImageToBlob + HEIC-aware loadDisplayableSrc)"
```

---

### Task 3: `PhotoCropper` component (UI via design flow)

**Files:**
- Create: `src/components/app/photo-cropper.tsx`

This is a new UI surface — build it through `/frontend-design` then `/ui-implementer`, kit primitives only (Dialog/Sheet, Button, a zoom Slider), tokens, no em-dashes. The design flow owns the styling; this task fixes the **interface + behavior** it must implement.

**Required interface:**
```ts
export interface PhotoCropperProps {
  file: File;                       // the picked file
  open: boolean;
  onConfirm: (cropped: Blob) => void;  // square JPEG Blob
  onCancel: () => void;
}
```

**Required behavior:**
- Client-only: import `react-easy-crop` and render only on the client (the file is the host page's `useState`, so the component itself can be a normal client component; if SSR complains, wrap the `Cropper` in a `next/dynamic({ ssr: false })`).
- On open: `loadDisplayableSrc(file)` -> set as the cropper image src; revoke the URL on unmount/close.
- `<Cropper image={src} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, areaPixels) => setArea(areaPixels)} restrictPosition minZoom={1} maxZoom={4} />`.
- Zoom control: a kit `Slider` (1..4) bound to `zoom` for desktop; pinch works via react-easy-crop on touch.
- Confirm button: `cropImageToBlob(src, area)` -> `onConfirm(blob)`. Disable Confirm until `area` is set.
- Small-image guard: if `area.width < 200`, block confirm with an inline message "Photo is too small to crop. Pick a larger image." (200 = a safe floor for the square upload.)
- Cancel button: `onCancel()` (host clears the file input so the same file can be re-picked).

- [ ] **Step 1: Run /frontend-design for PhotoCropper** (produces the design spec: modal layout, zoom slider placement, Confirm/Cancel, tokens).
- [ ] **Step 2: Run /ui-implementer** to build `photo-cropper.tsx` to the interface + behavior above.
- [ ] **Step 3: Verify** `npx tsc --noEmit` clean (ignore pre-existing `maptest-temp`) + `npx eslint src/components/app/photo-cropper.tsx` clean.
- [ ] **Step 4: Commit**

```bash
git add src/components/app/photo-cropper.tsx && git commit -m "feat: PhotoCropper pan+zoom modal (react-easy-crop, kit primitives)"
```

---

### Task 4: Wire the cropper into onboarding photos

**Files:**
- Modify: `src/app/onboarding/photos/page.tsx` (the `start(file, opts)` call is at ~line 146)

- [ ] **Step 1: Add cropper state + intercept the file**

Replace the path that currently does `slotHooks[slotIndex].start(file, opts)` so that, instead of starting immediately, it stores `{ file, slotIndex, opts }` in state and opens `PhotoCropper`. Render one `<PhotoCropper>` for the page (not per slot):

```tsx
// near the other useState hooks
const [pending, setPending] = useState<{ file: File; slotIndex: number; opts: StartOptions } | null>(null);

// where the file was selected (was: void slotHooks[slotIndex].start(file, opts))
setPending({ file, slotIndex, opts });

// near the end of the returned JSX
{pending && (
  <PhotoCropper
    file={pending.file}
    open
    onCancel={() => setPending(null)}
    onConfirm={(blob) => {
      const cropped = new File([blob], "crop.jpg", { type: "image/jpeg" });
      void slotHooks[pending.slotIndex].start(cropped, pending.opts);
      setPending(null);
    }}
  />
)}
```

Add `import { PhotoCropper } from "@/components/app/photo-cropper";`.

- [ ] **Step 2: Verify** `npx tsc --noEmit` clean + `npx eslint src/app/onboarding/photos/page.tsx` clean.
- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/photos/page.tsx && git commit -m "feat: crop step in onboarding photo upload"
```

---

### Task 5: Wire the cropper into profile-edit photos

**Files:**
- Modify: `src/components/profile-edit/section-photos.tsx`

- [ ] **Step 1: Apply the same intercept** — find where this component calls `start(file, opts)` on its `usePhotoUpload` slot(s) and route it through the same `pending` state + `<PhotoCropper>` pattern from Task 4 (wrap the cropped Blob as a `File` named `crop.jpg`, then `start`). Match this file's existing slot/handler shape.

- [ ] **Step 2: Verify** `npx tsc --noEmit` clean + `npx eslint src/components/profile-edit/section-photos.tsx` clean.
- [ ] **Step 3: Commit**

```bash
git add src/components/profile-edit/section-photos.tsx && git commit -m "feat: crop step in profile-edit photo upload"
```

---

### Task 6: Full verify + deploy

- [ ] **Step 1: Full typecheck + lint + tests**

Run: `npx tsc --noEmit` (clean, ignore `maptest-temp`), `npx eslint src` (clean), `npx vitest run tests/lib/crop-image.test.ts` (PASS).

- [ ] **Step 2: Push to deploy (Vercel-on-push)**

```bash
git push origin master
```

- [ ] **Step 3: User render-check** — Chrome is unavailable here (crashes the user's session). Ask the user to: pick a photo in onboarding and in profile edit, pan + zoom, Confirm, and verify the cropped square uploads correctly (and Cancel returns to the picker). HEIC: if testable, confirm an iPhone HEIC also crops.

---

## Self-review notes
- **Spec coverage:** pan+zoom (Task 3) ✓; square output (aspect=1, Task 3) ✓; new-uploads-only via the two entry points (Tasks 4-5) ✓; client-side crop (Task 2) ✓; react-easy-crop (Task 1) ✓; HEIC (`loadDisplayableSrc`, Task 2) ✓; min-size guard (Task 3) ✓; unchanged backend/compress/upload (Blob wrapped as File into existing `start`) ✓; cancel clears input (Tasks 4-5) ✓.
- **Type consistency:** `CropArea`/`croppedAreaPixels` shape `{x,y,width,height}` consistent across Tasks 2-3; `onConfirm(blob: Blob)` -> wrapped `new File(...)` before `start` in Tasks 4-5.
- **Known accommodation:** the canvas crop can't be pixel-tested in jsdom, so Task 2 tests the region/dimension logic via a canvas mock; the real pixels are verified in the Task 6 user render-check.
