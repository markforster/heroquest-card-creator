import { DEFAULT_PDF_PRINT_CONFIG, normalizePdfPrintConfig } from "@/lib/pdf-export/default-config";

describe("pdf-export default config", () => {
  it("defines the expected default poker-print config", () => {
    expect(DEFAULT_PDF_PRINT_CONFIG).toEqual({
      paper: "A4",
      orientation: "landscape",
      marginsMm: { top: 0, right: 0, bottom: 0, left: 0 },
      gapMm: { x: 0, y: 0 },
      cardMm: { width: 63.5, height: 88.9 },
      mode: "frontAndBack",
      bleedMode: "bakedInImage",
      bleedMm: 3,
      duplexPreset: "mirrorX",
    });
  });

  it("falls back to defaults for nullish or unsupported values", () => {
    expect(normalizePdfPrintConfig(null)).toEqual(DEFAULT_PDF_PRINT_CONFIG);
    expect(
      normalizePdfPrintConfig({
        paper: "A5" as never,
        orientation: "square" as never,
        mode: "backsOnly" as never,
        bleedMode: "unknown" as never,
        duplexPreset: "nope" as never,
      }),
    ).toEqual(DEFAULT_PDF_PRINT_CONFIG);
  });

  it("preserves allowed enum values and clamps numeric fields", () => {
    expect(
      normalizePdfPrintConfig({
        paper: "Letter",
        orientation: "portrait",
        cardMm: { width: -5, height: 0 },
        mode: "frontsOnly",
        bleedMode: "layoutBleed",
        bleedMm: -2,
        duplexPreset: "rotate180",
      }),
    ).toEqual({
      paper: "Letter",
      orientation: "portrait",
      marginsMm: { top: 0, right: 0, bottom: 0, left: 0 },
      gapMm: { x: 0, y: 0 },
      cardMm: { width: 1, height: 1 },
      mode: "frontsOnly",
      bleedMode: "layoutBleed",
      bleedMm: 0,
      duplexPreset: "rotate180",
    });
  });

  it("uses default card size and bleed when numeric inputs are not finite", () => {
    expect(
      normalizePdfPrintConfig({
        cardMm: { width: Number.NaN, height: Number.POSITIVE_INFINITY },
        bleedMm: Number.NaN,
      }),
    ).toEqual({
      ...DEFAULT_PDF_PRINT_CONFIG,
      cardMm: { width: 63.5, height: 88.9 },
      bleedMm: 3,
    });
  });
});
