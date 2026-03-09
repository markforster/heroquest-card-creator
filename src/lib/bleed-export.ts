"use client";

import {
  CARD_CORNER_RADIUS,
  CARD_HEIGHT,
  CARD_WIDTH,
} from "@/components/Cards/CardPreview/consts";

export type CropMarksOptions = {
  enabled: boolean;
  color: string;
  markLength?: number;
  thickness?: number;
  style?: "lines" | "squares";
};

export type CutMarksOptions = {
  enabled: boolean;
  color: string;
  thickness?: number;
  offset?: number;
  dash?: [number, number];
};

export type BleedComposeOptions = {
  fullCanvas: HTMLCanvasElement;
  backgroundCanvas?: HTMLCanvasElement | null;
  bleedPx: number;
  cropMarks?: CropMarksOptions;
  cutMarks?: CutMarksOptions;
};

export const DEFAULT_CROP_MARK_LENGTH = 20;
export const DEFAULT_CROP_MARK_THICKNESS = 2;
export const DEFAULT_CUT_MARK_OFFSET = 2;
export const DEFAULT_CUT_MARK_DASH: [number, number] = [6, 4];

export function cloneSvgForBleed(svg: SVGSVGElement): void {
  svg.querySelectorAll<SVGElement>("[clip-path], [clipPath]").forEach((node) => {
    if (node.hasAttribute("clip-path")) node.removeAttribute("clip-path");
    if (node.hasAttribute("clipPath")) node.removeAttribute("clipPath");
  });
  svg.querySelectorAll("clipPath").forEach((node) => node.remove());
}

export function setExportClip(svg: SVGSVGElement, { rounded }: { rounded: boolean }): void {
  const clipRect = svg.querySelector<SVGRectElement>("#cardClip rect");
  if (!clipRect) return;
  const radius = rounded ? CARD_CORNER_RADIUS : 0;
  clipRect.setAttribute("rx", String(radius));
  clipRect.setAttribute("ry", String(radius));
}

export function setExportBackgroundFit(svg: SVGSVGElement, mode: "slice" | "meet"): void {
  const preserve = mode === "slice" ? "xMidYMid slice" : "xMidYMid meet";
  svg
    .querySelectorAll<SVGImageElement>('image[data-card-background="true"]')
    .forEach((node) => {
      node.setAttribute("preserveAspectRatio", preserve);
    });
}

export function stripToBackgroundOnly(svg: SVGSVGElement): void {
  const backgroundImages = Array.from(
    svg.querySelectorAll<SVGImageElement>('image[data-card-background="true"]'),
  );
  if (backgroundImages.length === 0) return;

  const keep = new Set<Node>();
  keep.add(svg);
  svg.querySelectorAll("defs").forEach((node) => keep.add(node));
  backgroundImages.forEach((img) => {
    let current: Node | null = img;
    while (current) {
      keep.add(current);
      current = current.parentNode;
    }
  });

  const allNodes = Array.from(svg.querySelectorAll("*"));
  allNodes.forEach((node) => {
    if (!keep.has(node)) {
      node.remove();
    }
  });
}

export function stripToBleedSource(svg: SVGSVGElement): void {
  const bleedImages = Array.from(
    svg.querySelectorAll<SVGImageElement>(
      'image[data-card-background="true"], image[data-user-asset-id]',
    ),
  );
  if (bleedImages.length === 0) return;

  const keep = new Set<Node>();
  keep.add(svg);
  svg.querySelectorAll("defs").forEach((node) => keep.add(node));
  bleedImages.forEach((img) => {
    let current: Node | null = img;
    while (current) {
      keep.add(current);
      current = current.parentNode;
    }
  });

  const allNodes = Array.from(svg.querySelectorAll("*"));
  allNodes.forEach((node) => {
    if (!keep.has(node)) {
      node.remove();
    }
  });
}

export function composeBleedCanvas({
  fullCanvas,
  backgroundCanvas,
  bleedPx,
  cropMarks,
  cutMarks,
}: BleedComposeOptions): HTMLCanvasElement {
  const markLength = cropMarks?.enabled ? cropMarks.markLength ?? DEFAULT_CROP_MARK_LENGTH : 0;
  const markThickness = cropMarks?.enabled
    ? cropMarks.thickness ?? DEFAULT_CROP_MARK_THICKNESS
    : 0;
  const cutOffset = cutMarks?.enabled ? cutMarks.offset ?? DEFAULT_CUT_MARK_OFFSET : 0;
  const cutThickness = cutMarks?.enabled ? cutMarks.thickness ?? DEFAULT_CROP_MARK_THICKNESS : 0;
  const cutPadding = cutMarks?.enabled ? cutOffset + cutThickness : 0;
  const padding = Math.max(bleedPx, markLength, cutPadding);
  const outputWidth = CARD_WIDTH + padding * 2;
  const outputHeight = CARD_HEIGHT + padding * 2;

  const output = document.createElement("canvas");
  output.width = outputWidth;
  output.height = outputHeight;
  const ctx = output.getContext("2d");
  if (!ctx) return output;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  const trimX = padding;
  const trimY = padding;
  const trimW = CARD_WIDTH;
  const trimH = CARD_HEIGHT;

  const bleedCanvas = backgroundCanvas ?? fullCanvas;
  if (bleedPx > 0) {
    const bleedOffset = padding - bleedPx;
    drawBleedBands(ctx, bleedCanvas, bleedPx, {
      trimX,
      trimY,
      trimW,
      trimH,
      bleedOffset,
    });
  }

  ctx.drawImage(fullCanvas, trimX, trimY, trimW, trimH);

  if (cropMarks?.enabled) {
    drawCropMarks(ctx, {
      trimX,
      trimY,
      trimW,
      trimH,
      color: cropMarks.color,
      markLength,
      thickness: markThickness,
      style: cropMarks.style,
    });
  }

  if (cutMarks?.enabled) {
    drawCutMarks(ctx, {
      trimX,
      trimY,
      trimW,
      trimH,
      color: cutMarks.color,
      thickness: cutThickness,
      offset: cutOffset,
      dash: cutMarks.dash ?? DEFAULT_CUT_MARK_DASH,
    });
  }

  return output;
}

export function getBleedTrimOrigin({
  bleedPx,
  cropMarks,
  cutMarks,
}: {
  bleedPx: number;
  cropMarks?: CropMarksOptions;
  cutMarks?: CutMarksOptions;
}) {
  const markLength = cropMarks?.enabled ? cropMarks.markLength ?? DEFAULT_CROP_MARK_LENGTH : 0;
  const cutOffset = cutMarks?.enabled ? cutMarks.offset ?? DEFAULT_CUT_MARK_OFFSET : 0;
  const cutThickness = cutMarks?.enabled ? cutMarks.thickness ?? DEFAULT_CROP_MARK_THICKNESS : 0;
  const cutPadding = cutMarks?.enabled ? cutOffset + cutThickness : 0;
  const padding = Math.max(bleedPx, markLength, cutPadding);

  return { trimX: padding, trimY: padding };
}

function drawBleedBands(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  bleedPx: number,
  {
    trimX,
    trimY,
    trimW,
    trimH,
    bleedOffset,
  }: { trimX: number; trimY: number; trimW: number; trimH: number; bleedOffset: number },
) {
  const sourcePx = Math.floor(bleedPx / 2);
  if (sourcePx <= 0) return;

  const sxLeft = 0;
  const sxRight = trimW - sourcePx;
  const syTop = 0;
  const syBottom = trimH - sourcePx;

  // Left / Right bands
  drawMirror(
    ctx,
    source,
    sxLeft,
    0,
    sourcePx,
    trimH,
    bleedOffset,
    trimY,
    bleedPx,
    trimH,
    true,
    false,
  );
  drawMirror(
    ctx,
    source,
    sxRight,
    0,
    sourcePx,
    trimH,
    trimX + trimW,
    trimY,
    bleedPx,
    trimH,
    true,
    false,
  );

  // Top / Bottom bands
  drawMirror(
    ctx,
    source,
    0,
    syTop,
    trimW,
    sourcePx,
    trimX,
    bleedOffset,
    trimW,
    bleedPx,
    false,
    true,
  );
  drawMirror(
    ctx,
    source,
    0,
    syBottom,
    trimW,
    sourcePx,
    trimX,
    trimY + trimH,
    trimW,
    bleedPx,
    false,
    true,
  );

  // Corners
  drawMirror(
    ctx,
    source,
    sxLeft,
    syTop,
    sourcePx,
    sourcePx,
    bleedOffset,
    bleedOffset,
    bleedPx,
    bleedPx,
    true,
    true,
  );
  drawMirror(
    ctx,
    source,
    sxRight,
    syTop,
    sourcePx,
    sourcePx,
    trimX + trimW,
    bleedOffset,
    bleedPx,
    bleedPx,
    true,
    true,
  );
  drawMirror(
    ctx,
    source,
    sxLeft,
    syBottom,
    sourcePx,
    sourcePx,
    bleedOffset,
    trimY + trimH,
    bleedPx,
    bleedPx,
    true,
    true,
  );
  drawMirror(
    ctx,
    source,
    sxRight,
    syBottom,
    sourcePx,
    sourcePx,
    trimX + trimW,
    trimY + trimH,
    bleedPx,
    bleedPx,
    true,
    true,
  );
}

function drawMirror(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  flipX: boolean,
  flipY: boolean,
) {
  ctx.save();
  ctx.translate(dx + (flipX ? dw : 0), dy + (flipY ? dh : 0));
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh);
  ctx.restore();
}

export function drawCropMarks(
  ctx: CanvasRenderingContext2D,
  {
    trimX,
    trimY,
    trimW,
    trimH,
    color,
    markLength = DEFAULT_CROP_MARK_LENGTH,
    thickness = DEFAULT_CROP_MARK_THICKNESS,
    style = "lines",
  }: {
    trimX: number;
    trimY: number;
    trimW: number;
    trimH: number;
    color: string;
    markLength?: number;
    thickness?: number;
    style?: "lines" | "squares";
  },
) {
  const right = trimX + trimW;
  const bottom = trimY + trimH;

  ctx.save();
  ctx.fillStyle = color;

  if (style === "squares") {
    const size = markLength;
    ctx.fillRect(trimX - size, trimY - size, size, size);
    ctx.fillRect(right, trimY - size, size, size);
    ctx.fillRect(trimX - size, bottom, size, size);
    ctx.fillRect(right, bottom, size, size);
    ctx.restore();
    return;
  }

  // Top-left
  ctx.fillRect(trimX - markLength, trimY - thickness, markLength, thickness);
  ctx.fillRect(trimX - thickness, trimY - markLength, thickness, markLength);

  // Top-right
  ctx.fillRect(right, trimY - thickness, markLength, thickness);
  ctx.fillRect(right, trimY - markLength, thickness, markLength);

  // Bottom-left
  ctx.fillRect(trimX - markLength, bottom, markLength, thickness);
  ctx.fillRect(trimX - thickness, bottom, thickness, markLength);

  // Bottom-right
  ctx.fillRect(right, bottom, markLength, thickness);
  ctx.fillRect(right, bottom, thickness, markLength);

  ctx.restore();
}

export function drawCutMarks(
  ctx: CanvasRenderingContext2D,
  {
    trimX,
    trimY,
    trimW,
    trimH,
    color,
    thickness = DEFAULT_CROP_MARK_THICKNESS,
    offset = DEFAULT_CUT_MARK_OFFSET,
    dash = DEFAULT_CUT_MARK_DASH,
  }: {
    trimX: number;
    trimY: number;
    trimW: number;
    trimH: number;
    color: string;
    thickness?: number;
    offset?: number;
    dash?: [number, number];
  },
) {
  const x = trimX - offset;
  const y = trimY - offset;
  const w = trimW + offset * 2;
  const h = trimH + offset * 2;
  const radius = CARD_CORNER_RADIUS + offset;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
