"use client";

// Compresses/resizes an image entirely in the browser before it's ever sent
// anywhere. This is the fix for large phone-camera photos (often 3-12MB+ at
// full resolution) blowing past Vercel's ~4.5MB serverless function request
// body limit once base64-encoded for the AI classify call — that platform
// limit is what produced the plain-text "Request Entity Too Large" response
// that crashed response.json() on mobile. Desktop "worked" only because
// typical test images happened to be smaller than the limit.

export interface CompressedImage { file: File; dataUrl: string; }

const MAX_DIMENSION = 1600; // px, long edge — plenty for AI classification and a clear evidence photo
const JPEG_QUALITY = 0.82;

export async function compressImage(file: File): Promise<CompressedImage> {
  try {
    const sourceDataUrl = await readAsDataURL(file);
    const img = await loadImage(sourceDataUrl);

    let { width, height } = img;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width >= height) { height = Math.round((height * MAX_DIMENSION) / width); width = MAX_DIMENSION; }
      else { width = Math.round((width * MAX_DIMENSION) / height); height = MAX_DIMENSION; }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not supported");
    ctx.drawImage(img, 0, 0, width, height);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))), "image/jpeg", JPEG_QUALITY);
    });

    const compressedFile = new File([blob], renameToJpg(file.name), { type: "image/jpeg" });
    const compressedDataUrl = await readAsDataURL(compressedFile);
    return { file: compressedFile, dataUrl: compressedDataUrl };
  } catch (err) {
    // Rare decode failures (e.g. an unusual HEIC variant some browsers
    // can't draw to canvas) shouldn't hard-block the user. Fall back to the
    // original file — worst case we're back to pre-fix behavior for that
    // one photo rather than losing it entirely.
    console.warn("[imageCompress] falling back to original file:", err);
    const dataUrl = await readAsDataURL(file);
    return { file, dataUrl };
  }
}

function readAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}
function renameToJpg(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "photo"}.jpg`;
}
