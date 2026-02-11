"use client";

import { extractPaletteFromCanvas } from "@/lib/color-palette";

export type PaletteSource =
  | HTMLCanvasElement
  | HTMLImageElement
  | ImageBitmap
  | Blob;

export type PaletteOptions = {
  maxColors?: number;
  width?: number;
  height?: number;
};

export async function getPalette(source: PaletteSource, options: PaletteOptions = {}) {
  const canvas = await toCanvas(source, options);
  if (!canvas) return [];
  return extractPaletteFromCanvas(canvas, {
    maxColors: options.maxColors,
  });
}

export type PaletteGroupId = "dominant" | "vibrant" | "muted" | "dark" | "light" | "complementary";

export type PaletteGroup = {
  id: PaletteGroupId;
  colors: string[];
};

export async function getPaletteGroups(
  source: PaletteSource,
  options: PaletteOptions = {},
): Promise<PaletteGroup[]> {
  const base = await getPalette(source, { ...options, maxColors: options.maxColors ?? 12 });
  if (base.length === 0) return [];

  const withHsl = base.map((color) => {
    const rgb = hexToRgb(color);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { color, rgb, hsl };
  });

  const groups: PaletteGroup[] = [];
  const dominant = withHsl.slice(0, 4).map((entry) => entry.color);
  groups.push({ id: "dominant", colors: dominant });

  groups.push({
    id: "vibrant",
    colors: pickByMood(withHsl, (hsl) => hsl.s >= 0.6 && hsl.l >= 0.35 && hsl.l <= 0.7),
  });

  groups.push({
    id: "muted",
    colors: pickByMood(withHsl, (hsl) => hsl.s >= 0.25 && hsl.s < 0.6 && hsl.l >= 0.3 && hsl.l <= 0.75),
  });

  groups.push({
    id: "dark",
    colors: pickByMood(withHsl, (hsl) => hsl.l < 0.35),
  });

  groups.push({
    id: "light",
    colors: pickByMood(withHsl, (hsl) => hsl.l > 0.75),
  });

  const complementary = buildComplementary(withHsl);
  if (complementary.length > 0) {
    groups.push({ id: "complementary", colors: complementary });
  }

  return groups.filter((group) => group.colors.length > 0);
}

async function toCanvas(source: PaletteSource, options: PaletteOptions) {
  if (source instanceof HTMLCanvasElement) return source;

  if (source instanceof HTMLImageElement) {
    const width = options.width ?? source.naturalWidth;
    const height = options.height ?? source.naturalHeight;
    if (!width || !height) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  const bitmap = source instanceof ImageBitmap ? source : await toImageBitmap(source);
  if (!bitmap) return null;

  const width = options.width ?? bitmap.width;
  const height = options.height ?? bitmap.height;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

async function toImageBitmap(source: PaletteSource) {
  if (source instanceof ImageBitmap) return source;
  if (source instanceof HTMLImageElement) {
    if (!source.complete) {
      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve();
        source.onerror = () => reject(new Error("Failed to load image"));
      });
    }
    if (typeof createImageBitmap !== "function") return null;
    return await createImageBitmap(source);
  }
  if (source instanceof Blob) {
    if (typeof createImageBitmap !== "function") return null;
    return await createImageBitmap(source);
  }
  return null;
}

function pickByMood(
  entries: { color: string; rgb: Rgb; hsl: Hsl }[],
  predicate: (hsl: Hsl) => boolean,
  max = 5,
) {
  const picked: string[] = [];
  for (const entry of entries) {
    if (!predicate(entry.hsl)) continue;
    if (picked.some((color) => colorDistance(hexToRgb(color), entry.rgb) < 40)) continue;
    picked.push(entry.color);
    if (picked.length >= max) break;
  }
  return picked;
}

function buildComplementary(entries: { color: string; rgb: Rgb; hsl: Hsl }[]) {
  const sorted = [...entries].sort((a, b) => b.hsl.s - a.hsl.s);
  const base =
    sorted.find((entry) => entry.hsl.l >= 0.35 && entry.hsl.l <= 0.7) ?? sorted[0];
  if (!base) return [];

  const baseHsl = base.hsl;
  const targets = [180, 150, 210, 120, 240];
  const results: string[] = [];
  for (const offset of targets) {
    const next = {
      h: (baseHsl.h + offset) % 360,
      s: clamp(baseHsl.s, 0.35, 0.8),
      l: clamp(baseHsl.l, 0.35, 0.7),
    };
    const rgb = hslToRgb(next.h, next.s, next.l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    if (results.some((color) => colorDistance(hexToRgb(color), rgb) < 40)) continue;
    results.push(hex);
    if (results.length >= 5) break;
  }
  return results;
}

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((ch) => ch + ch)
        .join("")
    : normalized;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function toHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
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
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / delta + 2) * 60;
        break;
      default:
        h = ((rn - gn) / delta + 4) * 60;
        break;
    }
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function colorDistance(a: Rgb, b: Rgb) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
