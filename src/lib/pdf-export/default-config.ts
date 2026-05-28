import type { PrintConfig } from "@/lib/pdf-export/types";

export const DEFAULT_PDF_PRINT_CONFIG: PrintConfig = {
  paper: "A4",
  orientation: "landscape",
  marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
  gapMm: { x: 0.5, y: 0.5 },
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
      top: Number.isFinite(next.marginsMm?.top) ? Math.max(0, Number(next.marginsMm?.top)) : 10,
      right: Number.isFinite(next.marginsMm?.right) ? Math.max(0, Number(next.marginsMm?.right)) : 10,
      bottom: Number.isFinite(next.marginsMm?.bottom) ? Math.max(0, Number(next.marginsMm?.bottom)) : 10,
      left: Number.isFinite(next.marginsMm?.left) ? Math.max(0, Number(next.marginsMm?.left)) : 10,
    },
    gapMm: {
      x: Number.isFinite(next.gapMm?.x) ? Math.max(0, Number(next.gapMm?.x)) : 0.5,
      y: Number.isFinite(next.gapMm?.y) ? Math.max(0, Number(next.gapMm?.y)) : 0.5,
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
