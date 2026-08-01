import {
  DEFAULT_BLEED_PX,
  DEFAULT_EXPORT_ROUNDED_CORNERS,
  DEFAULT_PDF_PRINT_CONFIG,
  EXPORT_SETTINGS_STORAGE_KEYS,
  getExportSettings,
  restoreExportSettingKeys,
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

  it("persists supported pdf settings and normalizes edge-to-edge spacing", () => {
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
    expect(loaded.pdf).toEqual({
      ...next.pdf,
      marginsMm: { top: 0, right: 0, bottom: 0, left: 0 },
      gapMm: { x: 0, y: 0 },
    });
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

  it("persists and restores triangle crop mark style", () => {
    const current = getExportSettings();
    const next = {
      ...current,
      cropMarks: {
        ...current.cropMarks,
        enabled: true,
        style: "triangles" as const,
      },
    };

    setExportSettings(next);

    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.cropMarksStyle)).toBe(
      "triangles",
    );
    expect(getExportSettings().cropMarks.style).toBe("triangles");
  });

  it("persists and restores dotted cut mark style", () => {
    const current = getExportSettings();
    const next = {
      ...current,
      cutMarks: {
        ...current.cutMarks,
        enabled: true,
        style: "dotted" as const,
      },
    };

    setExportSettings(next);

    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.cutMarksStyle)).toBe("dotted");
    expect(getExportSettings().cutMarks.style).toBe("dotted");
  });

  it("treats persisted solid cut mark style as the legacy dashed default", () => {
    window.localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEYS.cutMarksStyle, "solid");

    expect(getExportSettings().cutMarks.style).toBe("dashed");
  });

  it("restores only string setting values", () => {
    restoreExportSettingKeys({
      [EXPORT_SETTINGS_STORAGE_KEYS.pdfPaper]: "Letter",
      [EXPORT_SETTINGS_STORAGE_KEYS.pdfMode]: null,
      [EXPORT_SETTINGS_STORAGE_KEYS.bleedPx]: undefined,
    });

    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.pdfPaper)).toBe("Letter");
    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.pdfMode)).toBeNull();
    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.bleedPx)).toBeNull();
  });

  it("ignores storage failures while restoring settings", () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() =>
      restoreExportSettingKeys({ [EXPORT_SETTINGS_STORAGE_KEYS.pdfPaper]: "A4" }),
    ).not.toThrow();

    setItem.mockRestore();
  });

  it("persists and restores long-dashed cut mark style", () => {
    const current = getExportSettings();
    const next = {
      ...current,
      cutMarks: {
        ...current.cutMarks,
        enabled: true,
        style: "long-dashed" as const,
      },
    };

    setExportSettings(next);

    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.cutMarksStyle)).toBe(
      "long-dashed",
    );
    expect(getExportSettings().cutMarks.style).toBe("long-dashed");
  });
});
