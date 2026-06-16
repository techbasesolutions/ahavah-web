"use client";

/**
 * PhotoCropper — pan + zoom square crop modal for profile photo uploads.
 *
 * Sits between picking a file and the existing compress/upload pipeline: the
 * user pans + zooms a 1:1 viewport, and Confirm rasterizes the framed region
 * to a square JPEG Blob (via `cropImageToBlob`). The output is always square
 * (aspect = 1) so it slots straight into the uniform square grid the
 * profile / discover / map cards assume.
 *
 * Composition (kit primitives only):
 *   - Dialog (shadcn / Base UI) — modal container, header, footer
 *   - Slider (shadcn / Base UI) — desktop zoom control (pinch handles touch)
 *   - Button (shadcn) — Confirm (lavender brand tone) + Cancel (ghost)
 *
 * Client-only: react-easy-crop touches `window`/the DOM at module load, so the
 * `<Cropper>` is dynamic-imported with `ssr: false` (same pattern as
 * `world-map.tsx` / the /map page's Leaflet import).
 *
 * Image source: `loadDisplayableSrc(file)` returns a displayable object URL
 * (HEIC/HEIF is converted to JPEG first). We revoke it on close / unmount /
 * file-change to avoid leaks.
 */

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { CropperProps } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  cropImageToBlob,
  loadDisplayableSrc,
  type CropArea,
} from "@/lib/crop-image";

// react-easy-crop reads `window`/DOM geometry at module load, so it must not
// run during SSR. Dynamic-import the default export with `ssr: false` (mirrors
// the Leaflet WorldMap import on the /map page).
//
// react-easy-crop types most of its props as required even though they have
// runtime `defaultProps` (rotation, cropShape, style, classes, etc.), and the
// `dynamic()` wrapper drops that defaulting from the type. Narrow the dynamic
// component to just the props we actually pass so we keep type-safety on those
// without being forced to spell out the defaulted ones.
type UsedCropperProps = Pick<
  CropperProps,
  | "image"
  | "crop"
  | "zoom"
  | "aspect"
  | "minZoom"
  | "maxZoom"
  | "restrictPosition"
  | "onCropChange"
  | "onZoomChange"
  | "onCropComplete"
>;
const Cropper = dynamic(() => import("react-easy-crop"), {
  ssr: false,
}) as ComponentType<UsedCropperProps>;

// Floor for the framed square's source-pixel width. Below this the upload
// would be too small to look right across the square card grid, so Confirm is
// blocked with an inline message instead of shipping a tiny image.
const MIN_CROP_PX = 200;

export interface PhotoCropperProps {
  file: File;
  open: boolean;
  /** Receives the framed square as a JPEG Blob. */
  onConfirm: (cropped: Blob) => void;
  onCancel: () => void;
}

export function PhotoCropper({
  file,
  open,
  onConfirm,
  onCancel,
}: PhotoCropperProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent showCloseButton={false} className="gap-4 sm:max-w-md">
        {/* Key the body on the file's identity so a new pick remounts it with
            fresh pan/zoom/area state — the idiomatic React reset, instead of a
            synchronous setState block inside an effect. Only render when open so
            we never resolve / hold an object URL for a closed modal. */}
        {open ? (
          <CropperBody
            key={`${file.name}:${file.size}:${file.lastModified}`}
            file={file}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CropperBody({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: (cropped: Blob) => void;
  onCancel: () => void;
}) {
  // Displayable image URL for the cropper viewport (null while it resolves).
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [cropping, setCropping] = useState(false);

  // Resolve the file to a displayable URL once (this body is keyed per file, so
  // it mounts fresh for each pick) and revoke it on unmount / close. No state
  // reset needed here — a new file gives a new key, hence a new mount.
  useEffect(() => {
    let active = true;
    let url: string | null = null;

    void loadDisplayableSrc(file).then((resolved) => {
      url = resolved;
      if (active) {
        setSrc(resolved);
      } else {
        // Resolved after unmount — revoke immediately.
        URL.revokeObjectURL(resolved);
      }
    });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const tooSmall = area !== null && area.width < MIN_CROP_PX;
  const canConfirm = src !== null && area !== null && !tooSmall && !cropping;

  async function handleConfirm() {
    if (!src || !area || tooSmall) return;
    setCropping(true);
    try {
      const blob = await cropImageToBlob(src, area);
      onConfirm(blob);
    } finally {
      setCropping(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Frame your photo</DialogTitle>
        <DialogDescription>
          Drag to reposition and use the slider to zoom. The square you see is
          what others will see.
        </DialogDescription>
      </DialogHeader>

      {/* Cropper viewport. react-easy-crop fills its parent absolutely, so the
            parent must be sized and position:relative. A square aspect keeps the
            framed region 1:1 on every screen width. */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        {src ? (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            minZoom={1}
            maxZoom={4}
            restrictPosition
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, areaPixels) => setArea(areaPixels)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="size-8 animate-spin text-lavender" />
            <span className="sr-only">Loading photo</span>
          </div>
        )}
      </div>

      {/* Zoom control — desktop affordance; pinch-zoom works natively on touch. */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="photo-cropper-zoom"
          className="text-meta font-medium text-(--ink-2)"
        >
          Zoom
        </label>
        <Slider
          id="photo-cropper-zoom"
          aria-label="Zoom"
          min={1}
          max={4}
          step={0.05}
          value={zoom}
          onValueChange={(value) =>
            setZoom(Array.isArray(value) ? value[0] : value)
          }
          disabled={src === null}
        />
      </div>

      {tooSmall ? (
        <p className="text-meta text-destructive">
          Photo is too small to crop. Pick a larger image.
        </p>
      ) : null}

      <DialogFooter>
        <Button
          variant="ghost"
          size="tap"
          onClick={onCancel}
          disabled={cropping}
        >
          Cancel
        </Button>
        <Button
          tone="brand"
          size="tap"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {cropping ? (
            <>
              <Loader2 className="animate-spin" />
              Cropping
            </>
          ) : (
            "Use photo"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
