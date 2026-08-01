const getBleedTrimOrigin = jest.fn(() => ({ trimX: 20, trimY: 20 }));

jest.mock("@/lib/bleed-export", () => ({
  getBleedTrimOrigin: (...args: unknown[]) => getBleedTrimOrigin(...args),
}));

import { resolvePdfExportBleedOptions } from "@/components/Export/pdfExportBleed";

describe("resolvePdfExportBleedOptions", () => {
  it("disables bleed-dependent settings when bleed is off", () => {
    const result = resolvePdfExportBleedOptions({
      bleedEnabled: false,
      bleedPx: 20,
      roundedCorners: true,
      cropMarksEnabled: true,
      cutMarksEnabled: true,
    });

    expect(result).toMatchObject({
      bleedPx: 0,
      bleedMm: 0,
      imagePaddingPx: 0,
      imagePaddingMm: 0,
      cropMarks: { enabled: false, style: "lines" },
      cutMarks: { enabled: false, style: "solid" },
      roundedCorners: true,
    });
    expect(getBleedTrimOrigin).not.toHaveBeenCalled();
  });

  it("clamps bleed and resolves mark settings and image padding", () => {
    const result = resolvePdfExportBleedOptions({
      bleedEnabled: true,
      bleedPx: -4,
      roundedCorners: false,
      cropMarksEnabled: true,
      cropMarkColor: "#111111",
      cropMarkStyle: "squares",
      cutMarksEnabled: true,
      cutMarkColor: "#222222",
      cutMarkStyle: "dashed",
    });

    expect(result).toMatchObject({
      bleedPx: 0,
      imagePaddingPx: 20,
      cropMarks: { enabled: true, color: "#111111", style: "squares" },
      cutMarks: { enabled: true, color: "#222222", style: "dashed" },
      roundedCorners: false,
    });
    expect(result.imagePaddingMm).toBeGreaterThan(0);
  });
});
