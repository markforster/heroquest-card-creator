import type { PrintConfig } from "@/lib/pdf-export/types";

export const DEFAULT_PDF_PRINT_CONFIG: PrintConfig = {
  paper: "A4",
  orientation: "landscape",
  marginsMm: { top: 0, right: 0, bottom: 0, left: 0 },
  gapMm: { x: 0, y: 0 },
  cardMm: { width: 63.5, height: 88.9 },
  mode: "frontAndBack",
  bleedMode: "bakedInImage",
  bleedMm: 3,
  duplexPreset: "mirrorX",
};

export function normalizePdfPrintConfig(value: Partial<PrintConfig> | null | undefined): PrintConfig {
  const next = value ?? {};
  return {
    paper: next.paper === "Letter" ? "Letter" : "A4",
    orientation: next.orientation === "portrait" ? "portrait" : "landscape",
    marginsMm: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    gapMm: {
      x: 0,
      y: 0,
    },
    cardMm: {
      width: Number.isFinite(next.cardMm?.width) ? Math.max(1, Number(next.cardMm?.width)) : 63.5,
      height: Number.isFinite(next.cardMm?.height) ? Math.max(1, Number(next.cardMm?.height)) : 88.9,
    },
    mode: next.mode === "frontsOnly" ? "frontsOnly" : "frontAndBack",
    bleedMode: next.bleedMode === "layoutBleed" ? "layoutBleed" : "bakedInImage",
    bleedMm: Number.isFinite(next.bleedMm)
      ? Math.max(0, Number(next.bleedMm))
      : DEFAULT_PDF_PRINT_CONFIG.bleedMm,
    duplexPreset:
      next.duplexPreset === "normal" ||
      next.duplexPreset === "mirrorX" ||
      next.duplexPreset === "rotate180" ||
      next.duplexPreset === "mirrorXRotate180"
        ? next.duplexPreset
        : "mirrorX",
  };
}
