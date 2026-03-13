import pica from "pica";

export type ImageOptimizationConfig = {
  maxDimension?: number | null;
  jpegQuality?: number | null;
};

export type ImageOptimizationResult = {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
};

type DecodedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
  release?: () => void;
};

const picaInstance = pica();

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx) => {
        ctx.drawImage(bitmap, 0, 0);
      },
      release: () => {
        bitmap.close?.();
      },
    };
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx) => {
        ctx.drawImage(img, 0, 0);
      },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function clampMaxDimension(value?: number | null): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value <= 0) return null;
  return Math.round(value);
}

function clampQuality(value?: number | null): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value <= 0) return 0.01;
  if (value > 1) return 1;
  return value;
}

function getTargetSize(
  width: number,
  height: number,
  maxDimension: number | null,
): { width: number; height: number } {
  if (!maxDimension) return { width, height };
  const maxEdge = Math.max(width, height);
  if (maxEdge <= maxDimension) return { width, height };
  const scale = maxDimension / maxEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode image"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

export async function optimizeImageBlob(
  blob: Blob,
  config: ImageOptimizationConfig,
): Promise<ImageOptimizationResult> {
  const decoded = await decodeImage(blob);
  const maxDimension = clampMaxDimension(config.maxDimension);
  const quality = clampQuality(config.jpegQuality);
  const targetSize = getTargetSize(decoded.width, decoded.height, maxDimension);
  const mimeType = blob.type || "image/png";

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = decoded.width;
  sourceCanvas.height = decoded.height;
  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) {
    decoded.release?.();
    throw new Error("Failed to create canvas context");
  }
  decoded.draw(sourceCtx);
  decoded.release?.();

  let outputCanvas = sourceCanvas;
  if (targetSize.width !== decoded.width || targetSize.height !== decoded.height) {
    const destCanvas = document.createElement("canvas");
    destCanvas.width = targetSize.width;
    destCanvas.height = targetSize.height;
    await picaInstance.resize(sourceCanvas, destCanvas, { alpha: true });
    outputCanvas = destCanvas;
  }

  const outputBlob = await canvasToBlob(
    outputCanvas,
    mimeType,
    mimeType === "image/jpeg" || mimeType === "image/jpg" || mimeType === "image/webp"
      ? quality
      : undefined,
  );

  return {
    blob: outputBlob,
    width: outputCanvas.width,
    height: outputCanvas.height,
    originalBytes: blob.size,
    optimizedBytes: outputBlob.size,
  };
}
