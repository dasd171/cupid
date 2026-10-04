/**
 * Client-side photo compression.
 *
 * Phone photos are often 3–12 MB, but Vercel's serverless functions reject
 * request bodies over ~4.5 MB with HTTP 413 *before our code even runs*.
 * Downscaling in the browser keeps uploads small, strips EXIF metadata
 * (a privacy win — no GPS/model info ever leaves the device), and is more
 * than enough for the vision model's scene-context job.
 *
 * Self-hosted (Docker) users don't hit the 4.5 MB platform cap, but
 * compression still applies — smaller uploads, same analysis quality.
 */

export const MAX_DIMENSION = 1280;
export const JPEG_QUALITY = 0.82;
/** Files at or below this size with small-enough dimensions skip re-encoding. */
export const COMPRESS_THRESHOLD_BYTES = 1024 * 1024;

/**
 * Scale (width, height) so the long edge is at most `maxDim`.
 * Never upscales. Pure helper — unit tested.
 */
export function fitWithin(
  width: number,
  height: number,
  maxDim: number,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: Math.max(0, width), height: Math.max(0, height) };
  }
  const scale = Math.min(1, maxDim / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decode(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    // imageOrientation "from-image" applies EXIF rotation so the photo
    // isn't sideways after we strip the metadata.
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  // Fallback for very old browsers.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image"));
      el.src = url;
    });
    return createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Return a compressed JPEG version of `file`.
 * Returns the original when compression isn't needed, wouldn't help,
 * or fails. Never throws — upload must never be blocked by this.
 */
export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await decode(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION);
    const needsResize = width !== bitmap.width || height !== bitmap.height;
    if (!needsResize && file.size <= COMPRESS_THRESHOLD_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPEG has no alpha channel — paint white behind transparent PNGs.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToJpeg(canvas, JPEG_QUALITY);
    // Never make the upload bigger than the original.
    if (blob.size >= file.size) return file;
    const base = file.name.replace(/\.[a-z0-9]+$/i, "") || "photo";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
