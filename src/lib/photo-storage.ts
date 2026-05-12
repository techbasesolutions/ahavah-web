import { base64Bytes } from "@/lib/image-compress";

/** Headroom under the typical 5MB localStorage quota. */
export const MAX_STORAGE_BYTES = 4 * 1024 * 1024;
/** Per-photo cap (after compression). 1MB is generous — typical compressed JPEG should be ~250-500KB. */
export const MAX_PHOTO_BYTES = 1 * 1024 * 1024;

export function estimateTotalBytes(photos: ReadonlyArray<string>): number {
  return photos.reduce((sum, p) => sum + base64Bytes(p), 0);
}

export type QuotaResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Returns whether a new photo of the given byte size can be added to the
 * current photos array without exceeding MAX_STORAGE_BYTES (4MB). Caller
 * should pass the photos array EXCLUDING the slot being replaced (if any)
 * so the size of the to-be-removed photo isn't double-counted.
 */
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
