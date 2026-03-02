import { parseHexColor } from "@/lib/color";

describe("parseHexColor", () => {
  it("parses 3/4/6/8 digit hex values", () => {
    const short = parseHexColor("#abc");
    expect(short).toEqual({
      hex: "#AABBCC",
      hexWithAlpha: "#AABBCCFF",
      alpha: 1,
      inputHasAlpha: false,
      isTransparent: false,
    });

    const shortAlpha = parseHexColor("#abcd");
    expect(shortAlpha).toEqual({
      hex: "#AABBCC",
      hexWithAlpha: "#AABBCCDD",
      alpha: 0xdd / 255,
      inputHasAlpha: true,
      isTransparent: false,
    });

    const full = parseHexColor("112233");
    expect(full).toEqual({
      hex: "#112233".toUpperCase(),
      hexWithAlpha: "#112233FF".toUpperCase(),
      alpha: 1,
      inputHasAlpha: false,
      isTransparent: false,
    });

    const fullAlpha = parseHexColor("#11223344");
    expect(fullAlpha).toEqual({
      hex: "#112233",
      hexWithAlpha: "#11223344",
      alpha: 0x44 / 255,
      inputHasAlpha: true,
      isTransparent: false,
    });
  });

  it("handles transparent when enabled", () => {
    const transparent = parseHexColor("transparent", { allowTransparent: true });
    expect(transparent).toEqual({
      hex: "#000000",
      hexWithAlpha: "#00000000",
      alpha: 0,
      inputHasAlpha: true,
      isTransparent: true,
    });
  });

  it("rejects invalid inputs", () => {
    expect(parseHexColor("")).toBeNull();
    expect(parseHexColor(" #")).toBeNull();
    expect(parseHexColor("#12")).toBeNull();
    expect(parseHexColor("#abcd12ef00")).toBeNull();
    expect(parseHexColor("#xyz")).toBeNull();
  });
});
