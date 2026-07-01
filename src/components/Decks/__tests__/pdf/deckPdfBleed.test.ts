import {
  convertDeckPdfTrimPxToMm,
  resolveDeckPdfBleedOptions,
} from "@/components/Decks/pdf/deckPdfBleed";

describe("deckPdfBleed", () => {
  it("converts trim-space pixels to millimeters using the 750px poker trim basis", () => {
    expect(convertDeckPdfTrimPxToMm(750)).toBeCloseTo(63.5);
    expect(convertDeckPdfTrimPxToMm(37)).toBeCloseTo((37 * 63.5) / 750);
  });

  it("uses bleed per edge for trim math and rendered padding for baked-image placement", () => {
    const resolved = resolveDeckPdfBleedOptions({
      bleedEnabled: true,
      bleedPx: 12,
      roundedCorners: true,
      cropMarksEnabled: true,
      cropMarkColor: "#00ffff",
      cropMarkStyle: "lines",
      cutMarksEnabled: false,
      cutMarkColor: "#00ffff",
      cutMarkStyle: "solid",
    });

    expect(resolved.bleedPx).toBe(12);
    expect(resolved.bleedMm).toBeCloseTo((12 * 63.5) / 750);
    expect(resolved.imagePaddingPx).toBe(20);
    expect(resolved.imagePaddingMm).toBeCloseTo((20 * 63.5) / 750);
    expect(resolved.cropMarks.enabled).toBe(true);
    expect(resolved.cutMarks.enabled).toBe(false);
  });

  it("disables bleed-side padding when bleed is off", () => {
    const resolved = resolveDeckPdfBleedOptions({
      bleedEnabled: false,
      bleedPx: 12,
      roundedCorners: false,
      cropMarksEnabled: true,
      cutMarksEnabled: true,
      cutMarkStyle: "solid",
    });

    expect(resolved.bleedPx).toBe(0);
    expect(resolved.bleedMm).toBe(0);
    expect(resolved.imagePaddingPx).toBe(0);
    expect(resolved.imagePaddingMm).toBe(0);
    expect(resolved.cropMarks.enabled).toBe(false);
    expect(resolved.cutMarks.enabled).toBe(false);
  });
});
