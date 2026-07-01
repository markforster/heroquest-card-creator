"use client";

import { DISABLE_BLEED_BAND_RENDER_FOR_TESTING, ENABLE_WATERMARK } from "@/config/flags";
import { composeBleedCanvas } from "@/lib/bleed-export";
import { renderSvgToCanvas } from "@/lib/render-svg-to-canvas";
import { applyWatermarkToCanvas, shouldApplyWatermark } from "@/lib/watermark";

import { mutateSvgForExport } from "./cardPreviewExportSvg";
import { CARD_HEIGHT, CARD_WIDTH } from "./consts";

import type { CardPreviewProps } from "./types";

export async function renderBleedCanvas({
  svgElement,
  bleedPx,
  cropMarks,
  cutMarks,
  roundedCorners,
  loggingId,
  assetBlobsById,
  templateId,
  developerCreditEnabled,
}: {
  svgElement: SVGSVGElement;
  bleedPx: number;
  cropMarks?: { enabled: boolean; color: string; style?: "lines" | "squares" | "triangles" };
  cutMarks?: { enabled: boolean; color: string };
  roundedCorners: boolean;
  loggingId?: string;
  assetBlobsById?: Map<string, Blob>;
  templateId?: CardPreviewProps["templateId"];
  developerCreditEnabled?: boolean;
}): Promise<HTMLCanvasElement | null> {
  const fullCanvas = await renderSvgToCanvas({
    svgElement,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    removeDebugBounds: true,
    loggingId,
    assetBlobsById,
    mutateSvg: (svg) =>
      mutateSvgForExport(svg, {
        mode: "bleed-full",
        roundedCorners,
        bleedPx,
        cropMarksEnabled: Boolean(cropMarks?.enabled),
        developerCreditEnabled,
        templateId,
      }),
  });
  if (!fullCanvas) return null;
  if (ENABLE_WATERMARK && shouldApplyWatermark(templateId)) {
    applyWatermarkToCanvas(fullCanvas);
  }

  let bleedSourceCanvas: HTMLCanvasElement | null = null;
  if (bleedPx > 0) {
    bleedSourceCanvas = await renderSvgToCanvas({
      svgElement,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      removeDebugBounds: true,
      loggingId,
      assetBlobsById,
      mutateSvg: (svg) =>
        mutateSvgForExport(svg, {
          mode: "bleed-source",
          bleedPx,
          cropMarksEnabled: Boolean(cropMarks?.enabled),
          developerCreditEnabled,
          templateId,
        }),
    });
  }

  return composeBleedCanvas({
    fullCanvas,
    backgroundCanvas: bleedSourceCanvas,
    bleedPx,
    renderBleedBands: !DISABLE_BLEED_BAND_RENDER_FOR_TESTING,
    cropMarks,
    cutMarks: cutMarks
      ? {
          enabled: cutMarks.enabled,
          color: cutMarks.color,
        }
      : cutMarks,
  });
}
