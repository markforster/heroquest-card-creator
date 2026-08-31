import { isTransparentHex } from "@/lib/color";

describe("isTransparentHex", () => {
  it("recognizes explicit transparent values and zero-alpha hex", () => {
    expect(isTransparentHex(undefined)).toBe(false);
    expect(isTransparentHex(" ")).toBe(false);
    expect(isTransparentHex("transparent", { allowTransparentString: true })).toBe(true);
    expect(isTransparentHex("#1234")).toBe(false);
    expect(isTransparentHex("#11223300")).toBe(true);
    expect(isTransparentHex("#112233")).toBe(false);
  });
});
