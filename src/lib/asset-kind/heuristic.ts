import type { AssetKindInput, AssetKindResult } from "./types";
import { clamp } from "@/lib/math";

type LumaStats = {
  edgeDensity: number;
  averageLuma: number;
  lumaStdDev: number;
};

type ColorStats = {
  grayscaleRatio: number;
  averageSaturation: number;
  uniqueColorRatio: number;
};

type TransparencyStats = {
  transparentRatio: number;
  borderTransparentRatio: number;
};

function normalizeByteRatio(value: number, total: number): number {
  if (total <= 0) return 0;
  return value / total;
}

function toLuma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function computeLumaStats(lumaValues: Float32Array, width: number, height: number): LumaStats {
  const count = lumaValues.length;
  if (count === 0) {
    return { edgeDensity: 0, averageLuma: 0, lumaStdDev: 0 };
  }

  let sum = 0;
  for (let i = 0; i < count; i += 1) {
    sum += lumaValues[i];
  }
  const mean = sum / count;

  let variance = 0;
  for (let i = 0; i < count; i += 1) {
    const diff = lumaValues[i] - mean;
    variance += diff * diff;
  }
  const stdDev = Math.sqrt(variance / count);

  if (width < 3 || height < 3) {
    return { edgeDensity: 0, averageLuma: mean, lumaStdDev: stdDev };
  }

  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -1 * lumaValues[i - width - 1] +
        1 * lumaValues[i - width + 1] +
        -2 * lumaValues[i - 1] +
        2 * lumaValues[i + 1] +
        -1 * lumaValues[i + width - 1] +
        1 * lumaValues[i + width + 1];
      const gy =
        -1 * lumaValues[i - width - 1] +
        -2 * lumaValues[i - width] +
        -1 * lumaValues[i - width + 1] +
        1 * lumaValues[i + width - 1] +
        2 * lumaValues[i + width] +
        1 * lumaValues[i + width + 1];
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeSum += magnitude;
      edgeCount += 1;
    }
  }
  const edgeDensity = edgeCount > 0 ? edgeSum / edgeCount : 0;

  return { edgeDensity, averageLuma: mean, lumaStdDev: stdDev };
}

function computeColorStats(
  rgba: Uint8ClampedArray,
  totalPixels: number,
  opaqueMask: Uint8Array,
): ColorStats {
  const uniqueColors = new Set<number>();
  let grayscaleCount = 0;
  let saturationSum = 0;
  let opaqueCount = 0;

  for (let i = 0; i < totalPixels; i += 1) {
    if (!opaqueMask[i]) continue;
    const offset = i * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min <= 12) {
      grayscaleCount += 1;
    }
    saturationSum += toSaturation(r, g, b);
    const quantized =
      ((r & 0xf0) << 8) |
      ((g & 0xf0) << 4) |
      (b & 0xf0);
    uniqueColors.add(quantized);
    opaqueCount += 1;
  }

  return {
    grayscaleRatio: normalizeByteRatio(grayscaleCount, opaqueCount),
    averageSaturation: opaqueCount > 0 ? saturationSum / opaqueCount : 0,
    uniqueColorRatio: normalizeByteRatio(uniqueColors.size, Math.max(opaqueCount, 1)),
  };
}

function computeTransparencyStats(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
): TransparencyStats {
  const totalPixels = width * height;
  let transparentCount = 0;
  let borderTransparentCount = 0;
  let borderCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const alpha = rgba[index * 4 + 3];
      const isTransparent = alpha <= alphaThreshold;
      if (isTransparent) {
        transparentCount += 1;
      }
      const isBorder = x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
      if (isBorder) {
        borderCount += 1;
        if (isTransparent) {
          borderTransparentCount += 1;
        }
      }
    }
  }

  return {
    transparentRatio: normalizeByteRatio(transparentCount, totalPixels),
    borderTransparentRatio: normalizeByteRatio(borderTransparentCount, borderCount),
  };
}

function buildOpaqueMask(rgba: Uint8ClampedArray, totalPixels: number, alphaThreshold: number) {
  const mask = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i += 1) {
    const alpha = rgba[i * 4 + 3];
    mask[i] = alpha > alphaThreshold ? 1 : 0;
  }
  return mask;
}

function computeIconScore(
  luma: LumaStats,
  color: ColorStats,
  transparency: TransparencyStats,
  dimensions?: { width?: number; height?: number },
): number {
  const edgeScore = clamp(luma.edgeDensity / 40, 0, 1);
  const grayscaleScore = clamp(color.grayscaleRatio / 0.8, 0, 1);
  const saturationScore = 1 - clamp(color.averageSaturation / 0.6, 0, 1);
  const colorScore = 1 - clamp(color.uniqueColorRatio / 0.2, 0, 1);
  const borderAlphaScore = clamp(transparency.borderTransparentRatio / 0.7, 0, 1);
  let totalScore =
    edgeScore * 0.3 +
    grayscaleScore * 0.2 +
    saturationScore * 0.2 +
    colorScore * 0.2 +
    borderAlphaScore * 0.1;

  if (color.averageSaturation > 0.35 && color.uniqueColorRatio > 0.12) {
    totalScore -= 0.18;
  }

  if (dimensions?.width && dimensions?.height) {
    const maxDim = Math.max(dimensions.width, dimensions.height);
    const minDim = Math.min(dimensions.width, dimensions.height);
    const aspectRatio = minDim > 0 ? maxDim / minDim : 1;
    if (aspectRatio >= 1.8) {
      totalScore -= 0.12;
    }
    if (maxDim >= 900) {
      totalScore -= 0.12;
    } else if (maxDim <= 256) {
      totalScore += 0.1;
    }
  }

  return clamp(totalScore, 0, 1);
}

export async function heuristicStrategy(input: AssetKindInput): Promise<AssetKindResult> {
  const { imageData, width, height } = input;
  const rgba =
    imageData instanceof ImageData
      ? imageData.data
      : imageData instanceof Uint8ClampedArray
        ? imageData
        : new Uint8ClampedArray(imageData);
  const totalPixels = width * height;
  if (totalPixels === 0 || rgba.length < totalPixels * 4) {
    return { kind: "unknown", confidence: 0, source: "heuristic" };
  }

  const alphaThreshold = 12;
  const opaqueMask = buildOpaqueMask(rgba, totalPixels, alphaThreshold);
  const lumaValues = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i += 1) {
    const offset = i * 4;
    lumaValues[i] = toLuma(rgba[offset], rgba[offset + 1], rgba[offset + 2]);
  }

  const lumaStats = computeLumaStats(lumaValues, width, height);
  const colorStats = computeColorStats(rgba, totalPixels, opaqueMask);
  const transparencyStats = computeTransparencyStats(rgba, width, height, alphaThreshold);
  const iconScore = computeIconScore(lumaStats, colorStats, transparencyStats, {
    width: input.originalWidth,
    height: input.originalHeight,
  });
  const originalWidth = input.originalWidth ?? 0;
  const originalHeight = input.originalHeight ?? 0;
  const maxDim = Math.max(originalWidth, originalHeight);
  const isTransparentSpriteArtwork =
    transparencyStats.transparentRatio > 0.35 &&
    lumaStats.edgeDensity > 20 &&
    (colorStats.averageSaturation > 0.18 || lumaStats.lumaStdDev > 35) &&
    maxDim >= 400;

  let kind: AssetKindResult["kind"] = "unknown";
  if (isTransparentSpriteArtwork) {
    kind = "artwork";
  } else if (iconScore >= 0.65) {
    kind = "icon";
  } else if (iconScore <= 0.35) {
    kind = "artwork";
  } else if (iconScore < 0.55 && colorStats.grayscaleRatio < 0.25) {
    kind = "artwork";
  }

  const confidence = clamp(Math.abs(iconScore - 0.5) * 2, 0, 1);

  return {
    kind,
    confidence,
    source: "heuristic",
  };
}
