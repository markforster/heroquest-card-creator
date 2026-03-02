import { formatCssColor, parseHexColor } from "@/lib/color";

describe("formatCssColor", () => {
  it("returns hex for non-alpha input", () => {
    const parsed = parseHexColor("#123456");
    if (!parsed) throw new Error("unexpected parse failure");
    expect(formatCssColor(parsed, { case: "upper" })).toBe("#123456");
  });

  it("returns rgba for alpha input with three decimal alpha", () => {
    const parsed = parseHexColor("#1234");
    if (!parsed) throw new Error("unexpected parse failure");
    expect(formatCssColor(parsed)).toBe("rgba(17, 34, 51, 0.267)");
  });
});
