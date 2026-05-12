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

const DEFAULT_OPTS: CompressOptions = {
  maxWidth: 1080,
  maxHeight: 1440,
  quality: 0.85,
};

/**
 * Compresses a File via canvas resize + JPEG encoding. Preserves aspect
 * ratio; resizes to fit within maxWidth x maxHeight. Output is a
 * data:image/jpeg;base64,... URL.
 *
 * Throws if the file isn't an image or can't be decoded.
 *
 * NOTE: requires browser canvas. Integration-tested via /onboarding/photos
 * smoke walk in T8, not unit-tested here (a jsdom canvas mock would test
 * the mock, not the real flow).
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = DEFAULT_OPTS,
): Promise<CompressResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file.");
  }
  const img = await loadImage(file);
  const { width, height } = fitWithin(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth,
    opts.maxHeight,
  );
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
export function fitWithin(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxW / srcW, maxH / srcH);
  return {
    width: Math.round(srcW * scale),
    height: Math.round(srcH * scale),
  };
}

/**
 * Approximate byte size of a base64 data URL. base64 encoding is
 * roughly 4/3 of binary; this strips the "data:...;base64," prefix
 * before computing `floor((b64.length * 3) / 4)`.
 *
 * Accepts raw base64 (no prefix) as well — returns the same calc.
 */
export function base64Bytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i === -1 ? dataUrl : dataUrl.slice(i + 1);
  return Math.floor((b64.length * 3) / 4);
}
