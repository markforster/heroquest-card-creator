export const PDF_EXPORT_JPEG_QUALITY = 0.8;

export function isPdfJpegOptimizationEnabled(
  disableFlag = process.env.NEXT_PUBLIC_DISABLE_PDF_JPEG_OPTIMIZATION,
): boolean {
  if (disableFlag == null) return true;
  const normalized = disableFlag.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return false;
  return true;
}

export async function encodePdfFaceAsJpeg(
  pngBytes: Uint8Array,
  quality = PDF_EXPORT_JPEG_QUALITY,
): Promise<Uint8Array | null> {
  if (typeof document === "undefined") {
    return null;
  }

  const sourceBlob = new Blob([pngBytes.slice().buffer], { type: "image/png" });
  const canvas = document.createElement("canvas");

  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(sourceBlob);
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        return null;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
    } else {
      await drawImageBlobToCanvas(sourceBlob, canvas);
    }

    return encodeCanvasAsJpeg(canvas, quality);
  } catch {
    try {
      await drawImageBlobToCanvas(sourceBlob, canvas);
      return encodeCanvasAsJpeg(canvas, quality);
    } catch {
      return null;
    }
  }
}

async function drawImageBlobToCanvas(blob: Blob, canvas: HTMLCanvasElement): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to decode PNG face"));
      nextImage.src = url;
    });
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create PDF JPEG canvas context");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function encodeCanvasAsJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const jpegBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality),
  );
  if (!jpegBlob) throw new Error("Unable to encode PDF face as JPEG");
  return new Uint8Array(await jpegBlob.arrayBuffer());
}
