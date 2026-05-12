import { describe, it, expect } from "vitest";
import { canAddPhoto, estimateTotalBytes, MAX_PHOTO_BYTES } from "@/lib/photo-storage";

// Helper: produce a data URL whose base64 portion decodes to approxBytes
function makeDataUrlOfBytes(approxBytes: number): string {
  // base64Bytes returns floor(b64.length * 3 / 4). For b64.length = ceil(approxBytes * 4 / 3),
  // we get a result close to approxBytes. Use 'A' padding (valid base64 char).
  const b64Length = Math.ceil(approxBytes * 4 / 3);
  return `data:image/jpeg;base64,${"A".repeat(b64Length)}`;
}

describe("photo-storage", () => {
  it("estimateTotalBytes — empty array returns 0", () => {
    expect(estimateTotalBytes([])).toBe(0);
  });

  it("estimateTotalBytes — sums approximate byte counts", () => {
    const photos = [makeDataUrlOfBytes(100_000), makeDataUrlOfBytes(200_000)];
    const total = estimateTotalBytes(photos);
    // Within 4 bytes of 300k due to base64 rounding
    expect(total).toBeGreaterThanOrEqual(299_000);
    expect(total).toBeLessThanOrEqual(301_000);
  });

  it("canAddPhoto — allows under quota", () => {
    const photos = [makeDataUrlOfBytes(500_000)]; // 500KB
    const result = canAddPhoto(photos, 500_000); // adding another 500KB → 1MB total
    expect(result.ok).toBe(true);
  });

  it("canAddPhoto — rejects single oversized photo", () => {
    const result = canAddPhoto([], MAX_PHOTO_BYTES + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/too large/i);
  });

  it("canAddPhoto — rejects when total would exceed MAX_STORAGE_BYTES", () => {
    // 4 photos near 1MB each = 4MB; adding a 5th 500KB photo would overflow
    const photos = Array.from({ length: 4 }, () => makeDataUrlOfBytes(900_000));
    const result = canAddPhoto(photos, 800_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/out of storage/i);
  });
});
