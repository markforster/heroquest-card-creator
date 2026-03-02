import { shouldApplyWatermark } from "@/lib/watermark";

jest.mock("@/data/card-templates", () => ({
  cardTemplatesById: {
    hero: { defaultFace: "front" },
    "hero-back": { defaultFace: "back" },
  },
}));

describe("shouldApplyWatermark", () => {
  it("returns true for front templates", () => {
    expect(shouldApplyWatermark("hero", {} as never)).toBe(true);
  });

  it("returns true for back templates", () => {
    expect(shouldApplyWatermark("hero-back", {} as never)).toBe(true);
  });

  it("ignores explicit face override", () => {
    expect(shouldApplyWatermark("hero", { face: "back" } as never)).toBe(true);
    expect(shouldApplyWatermark("hero-back", { face: "front" } as never)).toBe(true);
  });

  it("returns false when templateId is missing", () => {
    expect(shouldApplyWatermark(undefined, {} as never)).toBe(false);
  });
});
