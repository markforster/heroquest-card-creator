import { parseSuffix } from "@/lib/asset-filename";

describe("parseSuffix", () => {
  it("returns null suffix when there is no suffix pattern", () => {
    expect(parseSuffix("image")).toEqual({ root: "image", suffix: null });
  });

  it("parses a valid numeric suffix", () => {
    expect(parseSuffix("image (2)")).toEqual({ root: "image", suffix: 2 });
  });

  it("parses suffix with leading zeros", () => {
    expect(parseSuffix("image (01)")).toEqual({ root: "image", suffix: 1 });
  });

  it("treats suffix 0 as invalid", () => {
    expect(parseSuffix("image (0)")).toEqual({ root: "image (0)", suffix: null });
  });

  it("does not match when there is no space before the suffix", () => {
    expect(parseSuffix("image(2)")).toEqual({ root: "image(2)", suffix: null });
  });

  it("does not match when there is trailing text after the suffix", () => {
    expect(parseSuffix("image (2) copy")).toEqual({ root: "image (2) copy", suffix: null });
  });
});
