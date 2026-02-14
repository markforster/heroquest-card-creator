"use client";

type PaletteOptions = {
  maxColors?: number;
  minSaturation?: number;
  minLightness?: number;
  maxLightness?: number;
  minAlpha?: number;
  sampleStride?: number;
  insetPercent?: number;
};

type PaletteBucket = {
  count: number;
  r: number;
  g: number;
  b: number;
  saturation: number;
  lightness: number;
};

const DEFAULT_OPTIONS: Required<PaletteOptions> = {
  maxColors: 5,
  minSaturation: 0.18,
  minLightness: 0.08,
  maxLightness: 0.92,
  minAlpha: 40,
  sampleStride: 3,
  insetPercent: 0.08,
};

export function extractPaletteFromCanvas(
  canvas: HTMLCanvasElement,
  options: PaletteOptions = {},
): string[] {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const palette = extractPalette(canvas, merged);
  if (palette.length > 0) return palette;

  return extractPalette(canvas, {
    ...merged,
    minSaturation: Math.min(merged.minSaturation, 0.05),
    minLightness: Math.min(merged.minLightness, 0.04),
    maxLightness: Math.max(merged.maxLightness, 0.96),
  });
}

function extractPalette(
  canvas: HTMLCanvasElement,
  options: Required<PaletteOptions>,
): string[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const { width, height } = canvas;
  if (!width || !height) return [];

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const buckets = new Map<string, PaletteBucket>();

  const stride = Math.max(1, options.sampleStride);
  const inset = Math.round(Math.min(width, height) * Math.max(0, options.insetPercent));
  const xStart = inset;
  const yStart = inset;
  const xEnd = width - inset;
  const yEnd = height - inset;

  for (let y = yStart; y < yEnd; y += stride) {
    for (let x = xStart; x < xEnd; x += stride) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha < options.minAlpha) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const { h, s, l } = rgbToHsl(r, g, b);

      if (s < options.minSaturation) continue;
      if (l < options.minLightness || l > options.maxLightness) continue;

      const hueBucket = Math.floor(h * 12);
      const satBucket = Math.min(2, Math.floor(s * 3));
      const lightBucket = Math.min(2, Math.floor(l * 3));
      const key = `${hueBucket}-${satBucket}-${lightBucket}`;

      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.saturation += s;
        bucket.lightness += l;
      } else {
        buckets.set(key, {
          count: 1,
          r,
          g,
          b,
          saturation: s,
          lightness: l,
        });
      }
    }
  }

  const candidates = Array.from(buckets.values())
    .map((bucket) => {
      const count = bucket.count;
      const r = Math.round(bucket.r / count);
      const g = Math.round(bucket.g / count);
      const b = Math.round(bucket.b / count);
      const saturation = bucket.saturation / count;
      const lightness = bucket.lightness / count;
      const vibrance = 0.6 + saturation;
      const lightnessBalance = 1 - Math.min(1, Math.abs(lightness - 0.55) * 1.4);
      const score = count * vibrance * lightnessBalance;
      return { r, g, b, score };
    })
    .sort((a, b) => b.score - a.score);

  const chosen: { r: number; g: number; b: number }[] = [];
  for (const candidate of candidates) {
    if (chosen.length >= options.maxColors) break;
    if (
      chosen.some(
        (existing) => colorDistance(existing, candidate) < 55,
      )
    ) {
      continue;
    }
    chosen.push(candidate);
  }

  return chosen.map((color) => rgbToHex(color.r, color.g, color.b));
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / delta + 2) / 6;
        break;
      default:
        h = ((rn - gn) / delta + 4) / 6;
        break;
    }
  }

  return { h, s, l };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function toHex(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
