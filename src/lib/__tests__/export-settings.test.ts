import {
  DEFAULT_BLEED_PX,
  DEFAULT_EXPORT_ROUNDED_CORNERS,
  DEFAULT_PDF_PRINT_CONFIG,
  EXPORT_SETTINGS_STORAGE_KEYS,
  getExportSettings,
  setExportSettings,
} from "@/lib/export-settings";

describe("export-settings pdf defaults", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns pdf defaults when storage is empty", () => {
    const settings = getExportSettings();
    expect(settings.pdf).toEqual(DEFAULT_PDF_PRINT_CONFIG);
    expect(settings.bleed.bleedPx).toBe(DEFAULT_BLEED_PX);
    expect(settings.roundedCorners).toBe(DEFAULT_EXPORT_ROUNDED_CORNERS);
  });

  it("persists and restores pdf settings", () => {
    const next = {
      ...getExportSettings(),
      pdf: {
        ...DEFAULT_PDF_PRINT_CONFIG,
        paper: "Letter" as const,
        orientation: "portrait" as const,
        marginsMm: { top: 3, right: 4, bottom: 5, left: 6 },
        gapMm: { x: 1.25, y: 2.5 },
        mode: "frontsOnly" as const,
        duplexPreset: "rotate180" as const,
      },
    };

    setExportSettings(next);

    const loaded = getExportSettings();
    expect(loaded.pdf).toEqual(next.pdf);
    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.pdfPaper)).toBe("Letter");
    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.pdfMode)).toBe("frontsOnly");
  });

  it("falls back to defaults for invalid persisted values", () => {
    window.localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEYS.pdfPaper, "BadPaper");
    window.localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEYS.pdfOrientation, "bad");
    window.localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEYS.pdfMode, "bad");
    window.localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEYS.pdfGapX, "not-a-number");

    const loaded = getExportSettings();
    expect(loaded.pdf.paper).toBe(DEFAULT_PDF_PRINT_CONFIG.paper);
    expect(loaded.pdf.orientation).toBe(DEFAULT_PDF_PRINT_CONFIG.orientation);
    expect(loaded.pdf.mode).toBe(DEFAULT_PDF_PRINT_CONFIG.mode);
    expect(loaded.pdf.gapMm.x).toBe(DEFAULT_PDF_PRINT_CONFIG.gapMm.x);
  });
});
