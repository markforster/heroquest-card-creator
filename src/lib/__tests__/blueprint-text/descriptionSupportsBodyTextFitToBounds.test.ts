import {
  descriptionSupportsBodyTextFitToBounds,
  resolveBlueprintTextLayoutMode,
  supportsBlueprintTextFitToBounds,
} from "@/lib/blueprint-text";

describe("descriptionSupportsBodyTextFitToBounds", () => {
  it("enables fit-to-bounds for fixed-bounds description templates", () => {
    expect(descriptionSupportsBodyTextFitToBounds("small-treasure")).toBe(true);
    expect(descriptionSupportsBodyTextFitToBounds("large-treasure")).toBe(true);
    expect(descriptionSupportsBodyTextFitToBounds("hero-back")).toBe(true);
    expect(descriptionSupportsBodyTextFitToBounds("labelled-back")).toBe(true);
  });

  it("disables fit-to-bounds for auto-height description templates", () => {
    expect(descriptionSupportsBodyTextFitToBounds("hero")).toBe(false);
    expect(descriptionSupportsBodyTextFitToBounds("monster")).toBe(false);
  });
});

describe("blueprint text layout mode helpers", () => {
  it("defaults to fixed-bounds when no mode is specified", () => {
    expect(resolveBlueprintTextLayoutMode(undefined)).toBe("fixed-bounds");
    expect(supportsBlueprintTextFitToBounds(undefined)).toBe(true);
  });

  it("treats auto-height text as not supporting fit-to-bounds", () => {
    expect(
      resolveBlueprintTextLayoutMode({
        props: { textLayoutMode: "auto-height" },
      }),
    ).toBe("auto-height");
    expect(
      supportsBlueprintTextFitToBounds({
        props: { textLayoutMode: "auto-height" },
      }),
    ).toBe(false);
  });
});
