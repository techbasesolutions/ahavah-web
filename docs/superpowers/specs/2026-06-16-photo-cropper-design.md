# Photo Cropper (pan + zoom) — Design

**Goal:** Let Ahavah users frame their **profile** photo uploads with a pan + zoom square cropper, so they control what region of their photo becomes the square shown across the app, instead of getting an automatic center-crop.

**Approved decisions (brainstorming 2026-06-16):**
- **Control:** pan + zoom (any square region). Not aspect choice — output is always square (1:1), matching the uniform square grid the profile/discover/map cards assume.
- **Surfaces:** new uploads only — onboarding photo step + the add/replace flow in profile edit. Re-framing an existing photo = replace it (re-pick + re-crop). No server-stored originals.
- **Where the crop happens:** client-side (canvas). No backend change.
- **Library:** `react-easy-crop` (touch-ready pan/zoom), client-only dynamic import.
- **Scope:** profile photos only. The verification selfie / Bronze flow is out of scope (it is a liveness capture, not a framed profile shot).

## Current state (explored)
- **Backend** already crops uploads to a square (`service/person/__init__.py` `CropSize` + crop fn): centered by default, or at a supplied `top`/`left`. It does **not** support a crop *size* (no zoom). After this feature it receives an already-square image, so its crop is a no-op.
- **Frontend** `use-photo-upload.ts` `StartOptions` already carries optional `top`/`left` (dormant scaffolding, nothing sets them); `image-compress.ts` only resizes (preserves aspect, no crop); `uploadPhoto` PATCHes `/profile-info` with a base64 file by position.

## Architecture / data flow
Today: `pick file -> usePhotoUpload.start(file) -> compressImage -> uploadPhoto`.

New: insert a crop step between picking and starting.
```
pick file
  -> (if HEIC/HEIF) convert to JPEG blob   [reuse compressImage's heic2any step]
  -> open PhotoCropper(modal) with the image
       user pans/zooms a 1:1 viewport
       Confirm -> cropImageToBlob(src, croppedAreaPixels) -> square Blob
       Cancel  -> close, no upload
  -> usePhotoUpload.start(squareBlob)   [existing pipeline: compress -> upload]
```
The cropper replaces the *raw* file with a *cropped square* Blob before the existing pipeline runs. Everything downstream is unchanged.

## Components (units)
1. **`cropImageToBlob(src: string, area: {x,y,width,height}): Promise<Blob>`** (new util, `src/lib/crop-image.ts`)
   - Loads the source image, draws `area` onto a canvas sized to `area.width x area.height`, exports a JPEG Blob. Pure, unit-testable. No React.
2. **`PhotoCropper`** (new component, `src/components/app/photo-cropper.tsx`)
   - Kit-styled modal/sheet wrapping `react-easy-crop` (aspect = 1) + a zoom control (slider on desktop, pinch on touch) + Confirm / Cancel.
   - Props: `{ file: File; open: boolean; onConfirm: (blob: Blob) => void; onCancel: () => void }`.
   - Client-only (dynamic import, `ssr: false`, like the map) since react-easy-crop and canvas touch `window`.
   - On confirm: calls `cropImageToBlob` with react-easy-crop's `croppedAreaPixels`, returns the Blob.
3. **Wiring** — the two upload entry points change `file -> start()` into `file -> PhotoCropper -> croppedBlob -> start()`:
   - `src/app/onboarding/photos/page.tsx`
   - `src/components/profile-edit/section-photos.tsx`
   - Whatever shared photo-tile/add handler they both use (`photo-tile.tsx`) is the natural place to host the cropper state, so both surfaces get it once.

## What does NOT change
- Backend (server square-crop becomes a no-op on an already-square upload).
- `compressImage` (still resizes the cropped square), `usePhotoUpload` (state machine), `uploadPhoto` (transport).
- The dormant `StartOptions.top/left` scaffolding stays (pre-existing; noted, not deleted).

## Edge cases
- **HEIC/HEIF:** convert to a displayable JPEG blob *before* the cropper (reuse `compressImage`'s heic2any path; factor that step out if needed so both the cropper and compress can call it).
- **Min zoom:** bounded so the crop window can never exceed the image (react-easy-crop `minZoom`/restrictPosition handles this; verify).
- **Small images:** guard the output min dimension; if the framed square is below the upload minimum, block confirm with a clear message rather than upload a tiny image.
- **Touch + desktop:** pinch-zoom (touch) + zoom slider and wheel (desktop); drag to pan on both.
- **Cancel / re-pick:** Cancel returns to the picker with no upload; the file input is cleared so the same file can be re-picked.
- **Object URLs:** revoke the blob URL fed to the cropper on close to avoid leaks.

## Testing / verification
- **Unit:** `cropImageToBlob` — given a source image + a crop region, the output Blob has the expected square dimensions (use a small generated canvas/data-URL fixture in jsdom).
- **Type/lint:** `tsc --noEmit` + `eslint` clean on all touched files.
- **UI:** `PhotoCropper` is a new surface — runs through `/frontend-design` + `/ui-implementer` with kit primitives (Sheet/Dialog, Button, Slider) and tokens; no em-dashes in copy.
- **Rendered check:** the live pan/zoom/confirm interaction is verified by the **user** (headless Chrome is unavailable here — it crashes the user's session).

## Out of scope
- Re-cropping existing photos without re-uploading (would require storing originals).
- Non-square aspect ratios.
- Cropping the verification selfie.
- Filters/rotation/adjustments.
