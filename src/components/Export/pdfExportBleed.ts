"use client";

import { CARD_WIDTH } from "@/config/card-canvas";
import type { CropMarksOptions, CutMarksOptions } from "@/lib/bleed-export";
import { getBleedTrimOrigin } from "@/lib/bleed-export";
import { DEFAULT_CROP_MARK_COLOR, DEFAULT_CUT_MARK_COLOR } from "@/lib/export-settings";
import { DEFAULT_PDF_PRINT_CONFIG } from "@/lib/pdf-export/default-config";

export type PdfExportBleedSource = {
  bleedEnabled: boolean;
  bleedPx: number;
  roundedCorners: boolean;
  cropMarksEnabled: boolean;
  cropMarkColor?: string;
  cropMarkStyle?: "lines" | "squares" | "triangles";
  cutMarksEnabled: boolean;
  cutMarkColor?: string;
  cutMarkStyle?: "solid" | "dashed" | "long-dashed" | "dotted" | "ticks";
};

export type ResolvedPdfExportBleedOptions = {
  bleedPx: number;
  bleedMm: number;
  imagePaddingPx: number;
  imagePaddingMm: number;
  cropMarks: CropMarksOptions;
  cutMarks: CutMarksOptions;
  roundedCorners: boolean;
};

const MM_PER_TRIM_PX = DEFAULT_PDF_PRINT_CONFIG.cardMm.width / CARD_WIDTH;

export function convertPdfExportTrimPxToMm(px: number): number {
  return px * MM_PER_TRIM_PX;
}

export function resolvePdfExportBleedOptions(
  source: PdfExportBleedSource,
): ResolvedPdfExportBleedOptions {
  const bleedPx = source.bleedEnabled ? Math.max(0, source.bleedPx) : 0;
  const cropMarks: CropMarksOptions = {
    enabled: source.bleedEnabled ? source.cropMarksEnabled : false,
    color: source.cropMarkColor ?? DEFAULT_CROP_MARK_COLOR,
    style: source.cropMarkStyle ?? "lines",
  };
  const cutMarks: CutMarksOptions = {
    enabled: source.bleedEnabled ? source.cutMarksEnabled : false,
    color: source.cutMarkColor ?? DEFAULT_CUT_MARK_COLOR,
    style: source.cutMarkStyle ?? "solid",
  };
  const imagePaddingPx = source.bleedEnabled
    ? getBleedTrimOrigin({ bleedPx, cropMarks, cutMarks }).trimX
    : 0;

  return {
    bleedPx,
    bleedMm: convertPdfExportTrimPxToMm(bleedPx),
    imagePaddingPx,
    imagePaddingMm: convertPdfExportTrimPxToMm(imagePaddingPx),
    cropMarks,
    cutMarks,
    roundedCorners: source.roundedCorners,
  };
}
