"use client";

import { cardTemplatesById } from "@/data/card-templates";
import { CARD_CLIP_INSET, CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from "@/components/Cards/CardPreview/consts";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

export function resolveWatermarkPosition(width: number, height: number): { x: number; y: number } {
  const scaleX = width / CARD_WIDTH;
  const scaleY = height / CARD_HEIGHT;
  const rightOffset = CARD_CLIP_INSET + CARD_CORNER_RADIUS + 1;
  const bottomOffset = CARD_CLIP_INSET + 1;

  const rawX = Math.round(width - rightOffset * scaleX);
  const rawY = Math.round(height - bottomOffset * scaleY);

  const x = Math.min(Math.max(rawX, 0), Math.max(0, width - 1));
  const y = Math.min(Math.max(rawY, 0), Math.max(0, height - 1));

  return { x, y };
}

export function shouldApplyWatermark(
  templateId?: TemplateId,
  _cardData?: CardDataByTemplate[TemplateId],
): boolean {
  if (!templateId) return false;
  return Boolean(cardTemplatesById[templateId]);
}

export function resolveWatermarkColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): string {
  const { width, height } = ctx.canvas;
  const startX = Math.max(0, x - 1);
  const startY = Math.max(0, y - 1);
  const endX = Math.min(width - 1, x + 1);
  const endY = Math.min(height - 1, y + 1);
  const sampleWidth = Math.max(1, endX - startX + 1);
  const sampleHeight = Math.max(1, endY - startY + 1);

  const data = ctx.getImageData(startX, startY, sampleWidth, sampleHeight).data;
  let sum = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    sum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  const luminance = pixels > 0 ? sum / pixels : 1;

  return luminance < 0.45 ? "rgb(245, 240, 230)" : "rgb(6, 6, 6)";
}

export function applyWatermarkToCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { x, y } = resolveWatermarkPosition(canvas.width, canvas.height);
  ctx.fillStyle = resolveWatermarkColor(ctx, x, y);
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let offset = 0; offset < 5; offset += 1) {
    const dotX = x - offset * 2;
    if (dotX < 0 || dotX >= canvas.width) continue;
    ctx.fillRect(dotX, y, 1, 1);
  }
  ctx.restore();
}
