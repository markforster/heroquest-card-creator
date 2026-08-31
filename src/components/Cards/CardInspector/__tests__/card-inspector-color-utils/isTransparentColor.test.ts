import { isTransparentColor } from "@/components/Cards/CardInspector/card-inspector-color-utils";

describe("isTransparentColor", () => {
  it("recognizes the configured token and transparent hexadecimal colors", () => {
    expect(isTransparentColor(undefined, "transparent")).toBe(false);
    expect(isTransparentColor(" TRANSPARENT ", "transparent")).toBe(true);
    expect(isTransparentColor("#11223300", "transparent")).toBe(true);
    expect(isTransparentColor("#112233", "transparent")).toBe(false);
  });
});
