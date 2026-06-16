/**
 * Client-side photo crop helpers for the PhotoCropper.
 *
 * react-easy-crop reports the framed region as `croppedAreaPixels`
 * ({x,y,width,height} in SOURCE-image pixels); `cropImageToBlob` rasterizes
 * exactly that region to a square JPEG Blob via canvas. `loadDisplayableSrc`
 * gives the cropper viewport an image URL it can actually render (HEIC/HEIF
 * is converted to JPEG first, since browsers can't display HEIC).
 */

export type CropArea = { x: number; y: number; width: number; height: number };

/** Crop `src` (an image URL) to `area` (source-pixel rect) -> JPEG Blob. */
export async function cropImageToBlob(
  src: string,
  area: CropArea,
): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );
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

/**
 * Return an object URL the cropper can display. HEIC/HEIF is converted to JPEG
 * via heic2any first (browsers can't render HEIC), so the viewport always shows
 * something. The caller MUST revokeObjectURL the result when done.
 */
export async function loadDisplayableSrc(file: File): Promise<string> {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const isHeic =
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");
  if (!isHeic) return URL.createObjectURL(file);

  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : out;
  return URL.createObjectURL(blob as Blob);
}
