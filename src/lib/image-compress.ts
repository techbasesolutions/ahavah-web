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
 * Handles iPhone-default formats:
 *   - HEIC / HEIF — auto-converted to JPEG via heic2any before resize.
 *     iOS Safari decodes HEIC natively; Android Chrome / Firefox /
 *     desktop do NOT, so we always convert to be safe.
 *   - EXIF orientation — createImageBitmap with `imageOrientation:
 *     'from-image'` honors the EXIF rotation tag, so portraits taken
 *     in landscape mode upload right-side up.
 *
 * Throws if the file isn't an image or can't be decoded.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = DEFAULT_OPTS,
): Promise<CompressResult> {
  if (!file.type.startsWith("image/") && !looksHeic(file)) {
    throw new Error("Not an image file.");
  }

  // HEIC/HEIF preprocessing — convert to JPEG Blob before the canvas
  // path. heic2any is dynamic-imported so non-HEIC uploads don't pay
  // the ~600KB bundle cost.
  let source: Blob = file;
  if (looksHeic(file)) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      // heic2any returns Blob OR Blob[] (multi-image HEIC). Keep first.
      source = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      throw new Error("Could not decode this photo (HEIC/HEIF).");
    }
  }

  const bitmap = await loadBitmap(source);
  const { width, height } = fitWithin(
    bitmap.width,
    bitmap.height,
    opts.maxWidth,
    opts.maxHeight,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close(); // free GPU memory (ImageBitmap only)
  const dataUrl = canvas.toDataURL("image/jpeg", opts.quality);
  const bytes = base64Bytes(dataUrl);
  return { dataUrl, bytes, width, height };
}

function looksHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  // iOS sometimes sets type='' for HEIC files; sniff by extension.
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

/**
 * Decode a Blob as an ImageBitmap with EXIF orientation honored.
 * Falls back to an HTMLImageElement when createImageBitmap isn't
 * available (very old browsers); the fallback path does NOT honor
 * EXIF rotation but at least keeps uploads working.
 */
async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      // Fall through to <img> path.
    }
  }
  return loadHtmlImage(blob);
}

function loadHtmlImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
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
