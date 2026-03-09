import { shouldApplyWatermark } from "@/lib/watermark";

jest.mock("@/data/card-templates", () => ({
  cardTemplatesById: {
    hero: { defaultFace: "front" },
    "hero-back": { defaultFace: "back" },
  },
}));

describe("shouldApplyWatermark", () => {
  it("returns true for front templates", () => {
    expect(shouldApplyWatermark("hero")).toBe(true);
  });

  it("returns true for back templates", () => {
    expect(shouldApplyWatermark("hero-back")).toBe(true);
  });

  it("ignores explicit face override", () => {
    expect(shouldApplyWatermark("hero")).toBe(true);
    expect(shouldApplyWatermark("hero-back")).toBe(true);
  });

  it("returns false when templateId is missing", () => {
    expect(shouldApplyWatermark(undefined)).toBe(false);
  });
});
