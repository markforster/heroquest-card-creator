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
  style?: "lines" | "squares" | "triangles";
};

export type CutMarksOptions = {
  enabled: boolean;
  color: string;
  style?: "solid" | "dashed" | "dotted" | "ticks";
  thickness?: number;
  offset?: number;
  dash?: [number, number];
};

export type BleedComposeOptions = {
  fullCanvas: HTMLCanvasElement;
  backgroundCanvas?: HTMLCanvasElement | null;
  bleedPx: number;
  renderBleedBands?: boolean;
  cropMarks?: CropMarksOptions;
  cutMarks?: CutMarksOptions;
};

export const DEFAULT_CROP_MARK_LENGTH = 20;
export const DEFAULT_CROP_MARK_THICKNESS = 2;
export const DEFAULT_CROP_MARK_INWARD_RATIO = 0.25;
export const DEFAULT_CUT_MARK_OFFSET = 0;
export const DEFAULT_CUT_MARK_DASH: [number, number] = [6, 4];
export const DEFAULT_CUT_MARK_RADIUS_ADJUST = 2;
export const DEFAULT_CUT_MARK_STYLE: NonNullable<CutMarksOptions["style"]> = "solid";
export const DEFAULT_DASHED_CUT_MARK_DASH: [number, number] = [10, 6];
export const DEFAULT_DOTTED_CUT_MARK_DASH: [number, number] = [1, 5];
export const DEFAULT_TICK_CUT_MARK_LENGTH = 8;
export const DEFAULT_TICK_CUT_MARK_SPACING = 14;

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
  renderBleedBands = true,
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
  if (bleedPx > 0 && renderBleedBands) {
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
      style: cutMarks.style,
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
    style?: "lines" | "squares" | "triangles";
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

  if (style === "triangles") {
    const size = markLength;

    ctx.beginPath();
    ctx.moveTo(trimX, trimY);
    ctx.lineTo(trimX - size, trimY);
    ctx.lineTo(trimX, trimY - size);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(right, trimY);
    ctx.lineTo(right + size, trimY);
    ctx.lineTo(right, trimY - size);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(trimX, bottom);
    ctx.lineTo(trimX - size, bottom);
    ctx.lineTo(trimX, bottom + size);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(right, bottom);
    ctx.lineTo(right + size, bottom);
    ctx.lineTo(right, bottom + size);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    return;
  }

  const inwardExtension = Math.round(markLength * DEFAULT_CROP_MARK_INWARD_RATIO);

  // Top-left
  ctx.fillRect(trimX - markLength, trimY - thickness, markLength + inwardExtension, thickness);
  ctx.fillRect(trimX - thickness, trimY - markLength, thickness, markLength + inwardExtension);

  // Top-right
  ctx.fillRect(right - inwardExtension, trimY - thickness, markLength + inwardExtension, thickness);
  ctx.fillRect(right, trimY - markLength, thickness, markLength + inwardExtension);

  // Bottom-left
  ctx.fillRect(trimX - markLength, bottom, markLength + inwardExtension, thickness);
  ctx.fillRect(trimX - thickness, bottom - inwardExtension, thickness, markLength + inwardExtension);

  // Bottom-right
  ctx.fillRect(right - inwardExtension, bottom, markLength + inwardExtension, thickness);
  ctx.fillRect(right, bottom - inwardExtension, thickness, markLength + inwardExtension);

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
    style = DEFAULT_CUT_MARK_STYLE,
    thickness = DEFAULT_CROP_MARK_THICKNESS,
    offset = DEFAULT_CUT_MARK_OFFSET,
    dash = DEFAULT_CUT_MARK_DASH,
  }: {
    trimX: number;
    trimY: number;
    trimW: number;
    trimH: number;
    color: string;
    style?: "solid" | "dashed" | "dotted" | "ticks";
    thickness?: number;
    offset?: number;
    dash?: [number, number];
  },
) {
  // Canvas strokes are centered on the path. Shift the path outward by half
  // the stroke width so the inner edge of the cut mark sits flush with the
  // trim edge instead of painting onto the card face.
  const strokeInset = thickness / 2;
  const effectiveOffset = offset + strokeInset;
  const x = trimX - effectiveOffset;
  const y = trimY - effectiveOffset;
  const w = trimW + effectiveOffset * 2;
  const h = trimH + effectiveOffset * 2;
  const radius = CARD_CORNER_RADIUS + effectiveOffset + DEFAULT_CUT_MARK_RADIUS_ADJUST;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = style === "dotted" || style === "ticks" ? "round" : "butt";
  ctx.lineJoin = "round";

  if (style === "ticks") {
    ctx.setLineDash([]);
    drawCutMarkTicks(ctx, { x, y, w, h, radius });
    ctx.restore();
    return;
  }

  ctx.setLineDash(
    style === "dashed"
      ? DEFAULT_DASHED_CUT_MARK_DASH
      : style === "dotted"
        ? DEFAULT_DOTTED_CUT_MARK_DASH
        : dash,
  );
  traceRoundedCutPath(ctx, { x, y, w, h, radius });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function traceRoundedCutPath(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    w,
    h,
    radius,
  }: { x: number; y: number; w: number; h: number; radius: number },
) {
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
}

function strokeLineSegment(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawCutMarkTicks(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    w,
    h,
    radius,
  }: { x: number; y: number; w: number; h: number; radius: number },
) {
  const straightW = Math.max(0, w - radius * 2);
  const straightH = Math.max(0, h - radius * 2);
  const arcLen = radius > 0 ? (Math.PI * radius) / 2 : 0;
  const segmentLengths = [
    straightW,
    arcLen,
    straightH,
    arcLen,
    straightW,
    arcLen,
    straightH,
    arcLen,
  ];
  const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
  if (totalLength <= 0) return;

  const startOffset = DEFAULT_TICK_CUT_MARK_SPACING / 2;
  for (let distance = startOffset; distance < totalLength; distance += DEFAULT_TICK_CUT_MARK_SPACING) {
    const { px, py, nx, ny } = resolveRoundedPathSample({
      distance,
      x,
      y,
      w,
      h,
      radius,
      straightW,
      straightH,
      arcLen,
    });

    strokeLineSegment(
      ctx,
      px,
      py,
      px + nx * DEFAULT_TICK_CUT_MARK_LENGTH,
      py + ny * DEFAULT_TICK_CUT_MARK_LENGTH,
    );
  }
}

function resolveRoundedPathSample({
  distance,
  x,
  y,
  w,
  h,
  radius,
  straightW,
  straightH,
  arcLen,
}: {
  distance: number;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  straightW: number;
  straightH: number;
  arcLen: number;
}) {
  let remaining = distance;

  if (remaining <= straightW) {
    return { px: x + radius + remaining, py: y, nx: 0, ny: -1 };
  }
  remaining -= straightW;

  if (remaining <= arcLen && radius > 0) {
    const angle = -Math.PI / 2 + remaining / radius;
    return resolveArcSample(x + w - radius, y + radius, radius, angle);
  }
  remaining -= arcLen;

  if (remaining <= straightH) {
    return { px: x + w, py: y + radius + remaining, nx: 1, ny: 0 };
  }
  remaining -= straightH;

  if (remaining <= arcLen && radius > 0) {
    const angle = remaining / radius;
    return resolveArcSample(x + w - radius, y + h - radius, radius, angle);
  }
  remaining -= arcLen;

  if (remaining <= straightW) {
    return { px: x + w - radius - remaining, py: y + h, nx: 0, ny: 1 };
  }
  remaining -= straightW;

  if (remaining <= arcLen && radius > 0) {
    const angle = Math.PI / 2 + remaining / radius;
    return resolveArcSample(x + radius, y + h - radius, radius, angle);
  }
  remaining -= arcLen;

  if (remaining <= straightH) {
    return { px: x, py: y + h - radius - remaining, nx: -1, ny: 0 };
  }
  remaining -= straightH;

  if (radius > 0) {
    const angle = Math.PI + remaining / radius;
    return resolveArcSample(x + radius, y + radius, radius, angle);
  }

  return { px: x + radius, py: y, nx: 0, ny: -1 };
}

function resolveArcSample(cx: number, cy: number, radius: number, angle: number) {
  return {
    px: cx + Math.cos(angle) * radius,
    py: cy + Math.sin(angle) * radius,
    nx: Math.cos(angle),
    ny: Math.sin(angle),
  };
}
