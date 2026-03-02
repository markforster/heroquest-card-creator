import { formatHexColor, parseHexColor } from "@/lib/color";

describe("formatHexColor", () => {
  it("preserves alpha only when input had alpha", () => {
    const noAlpha = parseHexColor("#aabbcc");
    const withAlpha = parseHexColor("#aabbccdd");
    if (!noAlpha || !withAlpha) throw new Error("unexpected parse failure");

    expect(formatHexColor(noAlpha, { alphaMode: "preserve", case: "upper" })).toBe("#AABBCC");
    expect(formatHexColor(withAlpha, { alphaMode: "preserve", case: "upper" })).toBe("#AABBCCDD");
  });

  it("forces and strips alpha", () => {
    const parsed = parseHexColor("#abc");
    if (!parsed) throw new Error("unexpected parse failure");

    expect(formatHexColor(parsed, { alphaMode: "force", case: "upper" })).toBe("#AABBCCFF");
    expect(formatHexColor(parsed, { alphaMode: "strip", case: "upper" })).toBe("#AABBCC");
  });

  it("respects casing", () => {
    const parsed = parseHexColor("#abcdef");
    if (!parsed) throw new Error("unexpected parse failure");

    expect(formatHexColor(parsed, { alphaMode: "strip", case: "lower" })).toBe("#abcdef");
    expect(formatHexColor(parsed, { alphaMode: "strip", case: "upper" })).toBe("#ABCDEF");
  });
});
