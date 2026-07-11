"use client";

import { measureCardTextMaxLineWidth } from "@/components/Cards/CardParts/CardTextBlock";
import {
  DEVELOPER_CREDIT_BLEND_COLOR,
  DEVELOPER_CREDIT_BLEND_MODE,
  DEVELOPER_CREDIT_FONT_SCALE,
  DEVELOPER_CREDIT_OPACITY,
  DEVELOPER_CREDIT_RIGHT_INSET,
  DEVELOPER_CREDIT_TEXT,
  DEVELOPER_CREDIT_TOP_INSET,
} from "@/config/developer-credit";
import { getBleedTrimOrigin } from "@/lib/bleed-export";
import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";

import { resolveCopyrightTextStyle } from "./cardPreviewCopyright";
import { CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from "./consts";

import type { CardPreviewProps } from "./types";

function shouldShowDeveloperCredit(
  templateId?: CardPreviewProps["templateId"],
  cardData?: CardPreviewProps["cardData"],
) {
  return Boolean(templateId && cardData);
}

export function drawDeveloperCredit({
  canvas,
  templateId,
  cardData,
  bleedPx,
  cropMarks,
  cutMarks,
}: {
  canvas: HTMLCanvasElement;
  templateId?: CardPreviewProps["templateId"];
  cardData?: CardPreviewProps["cardData"];
  bleedPx: number;
  cropMarks?: { enabled: boolean; color: string; style?: "lines" | "squares" | "triangles" };
  cutMarks?: {
    enabled: boolean;
    color: string;
    style?: "solid" | "dashed" | "long-dashed" | "dotted" | "ticks";
  };
}) {
  if (!shouldShowDeveloperCredit(templateId, cardData)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const style = resolveCopyrightTextStyle(templateId);
  const fontSize = Math.max(1, Math.round(style.fontSize * DEVELOPER_CREDIT_FONT_SCALE));
  const effectiveTopInset = Math.max(DEVELOPER_CREDIT_TOP_INSET, CARD_CORNER_RADIUS + 2);
  const fontWeight = "400";
  const fontFamily = CARD_TEXT_FONT_FAMILY;
  ctx.font = `${fontWeight ? `${fontWeight} ` : ""}${fontSize}px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = DEVELOPER_CREDIT_BLEND_COLOR;

  const { trimX, trimY } = getBleedTrimOrigin({
    bleedPx,
    cropMarks,
    cutMarks,
  });
  const { maxLineWidth } = measureCardTextMaxLineWidth({
    text: DEVELOPER_CREDIT_TEXT,
    width: CARD_HEIGHT,
    fontSize,
    lineHeight: fontSize,
    fontFamily,
    fontWeight,
    letterSpacingEm: undefined,
    defaultAlign: "left",
  });
  const x = trimX + CARD_WIDTH - DEVELOPER_CREDIT_RIGHT_INSET;
  const y = trimY + effectiveTopInset + Math.max(0, Math.floor(maxLineWidth));
  ctx.save();
  ctx.globalCompositeOperation = DEVELOPER_CREDIT_BLEND_MODE as GlobalCompositeOperation;
  ctx.globalAlpha = DEVELOPER_CREDIT_OPACITY;
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(DEVELOPER_CREDIT_TEXT, 0, 0);
  ctx.restore();
}
