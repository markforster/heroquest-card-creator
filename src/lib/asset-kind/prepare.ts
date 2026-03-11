import type { AssetKindInput } from "./types";

const TARGET_SIZE = 128;

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareAssetKindInput(
  blob: Blob,
  originalDimensions?: { width: number; height: number },
): Promise<AssetKindInput> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close?.();
      throw new Error("Canvas context not available");
    }
    ctx.drawImage(bitmap, 0, 0, TARGET_SIZE, TARGET_SIZE);
    bitmap.close?.();
    const imageData = ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
    return {
      imageData,
      width: TARGET_SIZE,
      height: TARGET_SIZE,
      originalWidth: originalDimensions?.width,
      originalHeight: originalDimensions?.height,
    };
  }

  const img = await loadImageFromBlob(blob);
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas context not available");
  }
  ctx.drawImage(img, 0, 0, TARGET_SIZE, TARGET_SIZE);
  const imageData = ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
  return {
    imageData,
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    originalWidth: originalDimensions?.width,
    originalHeight: originalDimensions?.height,
  };
}
