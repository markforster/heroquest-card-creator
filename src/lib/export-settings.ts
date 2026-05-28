"use client";

import { formatHexColor, parseHexColor } from "@/lib/color";
import { DEFAULT_PDF_PRINT_CONFIG, normalizePdfPrintConfig } from "@/lib/pdf-export/default-config";
import type { PrintConfig } from "@/lib/pdf-export/types";

export { DEFAULT_PDF_PRINT_CONFIG };

export type ExportPngBleedSettings = {
  enabled: boolean;
  bleedPx: number;
  askBeforeExport: boolean;
};

export type ExportCropMarksSettings = {
  enabled: boolean;
  color: string;
  style: "lines" | "squares";
};

export type ExportCutMarksSettings = {
  enabled: boolean;
  color: string;
};

export type ExportSettings = {
  bleed: ExportPngBleedSettings;
  cropMarks: ExportCropMarksSettings;
  cutMarks: ExportCutMarksSettings;
  roundedCorners: boolean;
  pdf: PrintConfig;
};

export const DEFAULT_BLEED_PX = 36;
export const MAX_BLEED_PX = 36;
export const DEFAULT_CROP_MARK_COLOR = "#00FFFF";
export const DEFAULT_CROP_MARK_STYLE: ExportCropMarksSettings["style"] = "lines";
export const DEFAULT_CUT_MARK_COLOR = "#00FFFF";
export const DEFAULT_EXPORT_ROUNDED_CORNERS = true;

const STORAGE_KEYS = {
  bleedEnabled: "hqcc.exportPng.bleedEnabled",
  bleedPx: "hqcc.exportPng.bleedPx",
  askBeforeExport: "hqcc.exportPng.askBeforeExport",
  cropMarksEnabled: "hqcc.exportPng.cropMarksEnabled",
  cropMarksColor: "hqcc.exportPng.cropMarksColor",
  cropMarksStyle: "hqcc.exportPng.cropMarksStyle",
  cutMarksEnabled: "hqcc.exportPng.cutMarksEnabled",
  cutMarksColor: "hqcc.exportPng.cutMarksColor",
  roundedCorners: "hqcc.exportPng.roundedCorners",
  pdfPaper: "hqcc.exportPdf.paper",
  pdfOrientation: "hqcc.exportPdf.orientation",
  pdfMarginTop: "hqcc.exportPdf.marginTop",
  pdfMarginRight: "hqcc.exportPdf.marginRight",
  pdfMarginBottom: "hqcc.exportPdf.marginBottom",
  pdfMarginLeft: "hqcc.exportPdf.marginLeft",
  pdfGapX: "hqcc.exportPdf.gapX",
  pdfGapY: "hqcc.exportPdf.gapY",
  pdfMode: "hqcc.exportPdf.mode",
  pdfBleedMode: "hqcc.exportPdf.bleedMode",
  pdfBleedMm: "hqcc.exportPdf.bleedMm",
  pdfDuplexPreset: "hqcc.exportPdf.duplexPreset",
} as const;

export function getExportSettings(): ExportSettings {
  if (typeof window === "undefined") {
    return {
      bleed: {
        enabled: false,
        bleedPx: DEFAULT_BLEED_PX,
        askBeforeExport: false,
      },
      cropMarks: {
        enabled: false,
        color: DEFAULT_CROP_MARK_COLOR,
        style: DEFAULT_CROP_MARK_STYLE,
      },
      cutMarks: {
        enabled: false,
        color: DEFAULT_CUT_MARK_COLOR,
      },
      roundedCorners: DEFAULT_EXPORT_ROUNDED_CORNERS,
      pdf: DEFAULT_PDF_PRINT_CONFIG,
    };
  }

  const bleedEnabled = readBool(STORAGE_KEYS.bleedEnabled, false);
  const askBeforeExport = safeGetItem(STORAGE_KEYS.askBeforeExport) === "1";
  const bleedPx = normalizeBleedPx(readNumber(STORAGE_KEYS.bleedPx, DEFAULT_BLEED_PX));
  const cropMarksEnabled = readBool(STORAGE_KEYS.cropMarksEnabled, false);
  const cropMarksColor = normalizeColor(readString(STORAGE_KEYS.cropMarksColor, ""));
  const cropMarksStyle = readCropMarksStyle(
    readString(STORAGE_KEYS.cropMarksStyle, DEFAULT_CROP_MARK_STYLE),
  );
  const cutMarksEnabled = readBool(STORAGE_KEYS.cutMarksEnabled, false);
  const cutMarksColor = normalizeColor(readString(STORAGE_KEYS.cutMarksColor, ""));
  const roundedCorners = readBool(
    STORAGE_KEYS.roundedCorners,
    DEFAULT_EXPORT_ROUNDED_CORNERS,
  );
  const pdf = normalizePdfPrintConfig({
    paper: readString(STORAGE_KEYS.pdfPaper, DEFAULT_PDF_PRINT_CONFIG.paper) as PrintConfig["paper"],
    orientation: readString(
      STORAGE_KEYS.pdfOrientation,
      DEFAULT_PDF_PRINT_CONFIG.orientation,
    ) as PrintConfig["orientation"],
    marginsMm: {
      top: readNumber(STORAGE_KEYS.pdfMarginTop, DEFAULT_PDF_PRINT_CONFIG.marginsMm.top),
      right: readNumber(STORAGE_KEYS.pdfMarginRight, DEFAULT_PDF_PRINT_CONFIG.marginsMm.right),
      bottom: readNumber(STORAGE_KEYS.pdfMarginBottom, DEFAULT_PDF_PRINT_CONFIG.marginsMm.bottom),
      left: readNumber(STORAGE_KEYS.pdfMarginLeft, DEFAULT_PDF_PRINT_CONFIG.marginsMm.left),
    },
    gapMm: {
      x: readFloat(STORAGE_KEYS.pdfGapX, DEFAULT_PDF_PRINT_CONFIG.gapMm.x),
      y: readFloat(STORAGE_KEYS.pdfGapY, DEFAULT_PDF_PRINT_CONFIG.gapMm.y),
    },
    mode: readString(STORAGE_KEYS.pdfMode, DEFAULT_PDF_PRINT_CONFIG.mode) as PrintConfig["mode"],
    bleedMode: readString(
      STORAGE_KEYS.pdfBleedMode,
      DEFAULT_PDF_PRINT_CONFIG.bleedMode,
    ) as PrintConfig["bleedMode"],
    bleedMm: readFloat(STORAGE_KEYS.pdfBleedMm, DEFAULT_PDF_PRINT_CONFIG.bleedMm ?? 0),
    cardMm: DEFAULT_PDF_PRINT_CONFIG.cardMm,
    duplexPreset: readString(
      STORAGE_KEYS.pdfDuplexPreset,
      DEFAULT_PDF_PRINT_CONFIG.duplexPreset ?? "mirrorX",
    ) as PrintConfig["duplexPreset"],
  });

  return {
    bleed: { enabled: bleedEnabled, bleedPx, askBeforeExport },
    cropMarks: { enabled: cropMarksEnabled, color: cropMarksColor, style: cropMarksStyle },
    cutMarks: { enabled: cutMarksEnabled, color: cutMarksColor },
    roundedCorners,
    pdf,
  };
}

export function setExportSettings(next: ExportSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.bleedEnabled, next.bleed.enabled ? "1" : "0");
    window.localStorage.setItem(STORAGE_KEYS.bleedPx, String(normalizeBleedPx(next.bleed.bleedPx)));
    window.localStorage.setItem(
      STORAGE_KEYS.askBeforeExport,
      next.bleed.askBeforeExport ? "1" : "0",
    );
    window.localStorage.setItem(
      STORAGE_KEYS.cropMarksEnabled,
      next.cropMarks.enabled ? "1" : "0",
    );
    window.localStorage.setItem(
      STORAGE_KEYS.cropMarksColor,
      normalizeColor(next.cropMarks.color),
    );
    window.localStorage.setItem(
      STORAGE_KEYS.cropMarksStyle,
      next.cropMarks.style ?? DEFAULT_CROP_MARK_STYLE,
    );
    window.localStorage.setItem(
      STORAGE_KEYS.cutMarksEnabled,
      next.cutMarks.enabled ? "1" : "0",
    );
    window.localStorage.setItem(
      STORAGE_KEYS.cutMarksColor,
      normalizeColor(next.cutMarks.color),
    );
    window.localStorage.setItem(
      STORAGE_KEYS.roundedCorners,
      next.roundedCorners ? "1" : "0",
    );
    window.localStorage.setItem(STORAGE_KEYS.pdfPaper, next.pdf.paper);
    window.localStorage.setItem(STORAGE_KEYS.pdfOrientation, next.pdf.orientation);
    window.localStorage.setItem(STORAGE_KEYS.pdfMarginTop, String(Math.max(0, next.pdf.marginsMm.top)));
    window.localStorage.setItem(STORAGE_KEYS.pdfMarginRight, String(Math.max(0, next.pdf.marginsMm.right)));
    window.localStorage.setItem(STORAGE_KEYS.pdfMarginBottom, String(Math.max(0, next.pdf.marginsMm.bottom)));
    window.localStorage.setItem(STORAGE_KEYS.pdfMarginLeft, String(Math.max(0, next.pdf.marginsMm.left)));
    window.localStorage.setItem(STORAGE_KEYS.pdfGapX, String(Math.max(0, next.pdf.gapMm.x)));
    window.localStorage.setItem(STORAGE_KEYS.pdfGapY, String(Math.max(0, next.pdf.gapMm.y)));
    window.localStorage.setItem(STORAGE_KEYS.pdfMode, next.pdf.mode);
    window.localStorage.setItem(STORAGE_KEYS.pdfBleedMode, next.pdf.bleedMode);
    window.localStorage.setItem(
      STORAGE_KEYS.pdfBleedMm,
      String(Math.max(0, next.pdf.bleedMm ?? DEFAULT_PDF_PRINT_CONFIG.bleedMm ?? 0)),
    );
    window.localStorage.setItem(STORAGE_KEYS.pdfDuplexPreset, next.pdf.duplexPreset ?? "mirrorX");
  } catch {
    // ignore storage failures
  }
}

export function normalizeBleedPx(value: unknown): number {
  const parsed = Number.isFinite(value as number) ? Number(value) : Number.parseInt(`${value}`, 10);
  if (Number.isNaN(parsed)) return DEFAULT_BLEED_PX;
  return Math.min(Math.max(Math.round(parsed), 0), MAX_BLEED_PX);
}

export function normalizeColor(value: string | undefined): string {
  const parsed = parseHexColor(value);
  if (!parsed) return DEFAULT_CROP_MARK_COLOR;
  return formatHexColor(parsed, { alphaMode: "strip", case: "upper" });
}

export function readExportSettingKeys(): Record<string, string | null> {
  if (typeof window === "undefined") {
    return {
      [STORAGE_KEYS.bleedEnabled]: null,
      [STORAGE_KEYS.bleedPx]: null,
      [STORAGE_KEYS.askBeforeExport]: null,
      [STORAGE_KEYS.cropMarksEnabled]: null,
      [STORAGE_KEYS.cropMarksColor]: null,
      [STORAGE_KEYS.cropMarksStyle]: null,
      [STORAGE_KEYS.cutMarksEnabled]: null,
      [STORAGE_KEYS.cutMarksColor]: null,
      [STORAGE_KEYS.roundedCorners]: null,
      [STORAGE_KEYS.pdfPaper]: null,
      [STORAGE_KEYS.pdfOrientation]: null,
      [STORAGE_KEYS.pdfMarginTop]: null,
      [STORAGE_KEYS.pdfMarginRight]: null,
      [STORAGE_KEYS.pdfMarginBottom]: null,
      [STORAGE_KEYS.pdfMarginLeft]: null,
      [STORAGE_KEYS.pdfGapX]: null,
      [STORAGE_KEYS.pdfGapY]: null,
      [STORAGE_KEYS.pdfMode]: null,
      [STORAGE_KEYS.pdfBleedMode]: null,
      [STORAGE_KEYS.pdfBleedMm]: null,
      [STORAGE_KEYS.pdfDuplexPreset]: null,
    };
  }
  return {
    [STORAGE_KEYS.bleedEnabled]: safeGetItem(STORAGE_KEYS.bleedEnabled),
    [STORAGE_KEYS.bleedPx]: safeGetItem(STORAGE_KEYS.bleedPx),
    [STORAGE_KEYS.askBeforeExport]: safeGetItem(STORAGE_KEYS.askBeforeExport),
    [STORAGE_KEYS.cropMarksEnabled]: safeGetItem(STORAGE_KEYS.cropMarksEnabled),
    [STORAGE_KEYS.cropMarksColor]: safeGetItem(STORAGE_KEYS.cropMarksColor),
    [STORAGE_KEYS.cropMarksStyle]: safeGetItem(STORAGE_KEYS.cropMarksStyle),
    [STORAGE_KEYS.cutMarksEnabled]: safeGetItem(STORAGE_KEYS.cutMarksEnabled),
    [STORAGE_KEYS.cutMarksColor]: safeGetItem(STORAGE_KEYS.cutMarksColor),
    [STORAGE_KEYS.roundedCorners]: safeGetItem(STORAGE_KEYS.roundedCorners),
    [STORAGE_KEYS.pdfPaper]: safeGetItem(STORAGE_KEYS.pdfPaper),
    [STORAGE_KEYS.pdfOrientation]: safeGetItem(STORAGE_KEYS.pdfOrientation),
    [STORAGE_KEYS.pdfMarginTop]: safeGetItem(STORAGE_KEYS.pdfMarginTop),
    [STORAGE_KEYS.pdfMarginRight]: safeGetItem(STORAGE_KEYS.pdfMarginRight),
    [STORAGE_KEYS.pdfMarginBottom]: safeGetItem(STORAGE_KEYS.pdfMarginBottom),
    [STORAGE_KEYS.pdfMarginLeft]: safeGetItem(STORAGE_KEYS.pdfMarginLeft),
    [STORAGE_KEYS.pdfGapX]: safeGetItem(STORAGE_KEYS.pdfGapX),
    [STORAGE_KEYS.pdfGapY]: safeGetItem(STORAGE_KEYS.pdfGapY),
    [STORAGE_KEYS.pdfMode]: safeGetItem(STORAGE_KEYS.pdfMode),
    [STORAGE_KEYS.pdfBleedMode]: safeGetItem(STORAGE_KEYS.pdfBleedMode),
    [STORAGE_KEYS.pdfBleedMm]: safeGetItem(STORAGE_KEYS.pdfBleedMm),
    [STORAGE_KEYS.pdfDuplexPreset]: safeGetItem(STORAGE_KEYS.pdfDuplexPreset),
  };
}

export function restoreExportSettingKeys(values: Record<string, string | null | undefined>): void {
  if (typeof window === "undefined") return;
  try {
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === "string") {
        window.localStorage.setItem(key, value);
      }
    });
  } catch {
    // ignore
  }
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readString(key: string, fallback: string): string {
  const value = safeGetItem(key);
  if (typeof value !== "string") return fallback;
  return value;
}

function readCropMarksStyle(value: string | null): ExportCropMarksSettings["style"] {
  if (value === "squares") return "squares";
  return "lines";
}

function readBool(key: string, fallback: boolean): boolean {
  const value = safeGetItem(key);
  if (value == null) return fallback;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function readNumber(key: string, fallback: number): number {
  const value = safeGetItem(key);
  if (value == null) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function readFloat(key: string, fallback: number): number {
  const value = safeGetItem(key);
  if (value == null) return fallback;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

export const EXPORT_SETTINGS_STORAGE_KEYS = STORAGE_KEYS;
