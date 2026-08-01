import { computeAverageLuminance } from "@/lib/color-contrast";

function imageData(data: number[], width: number, height: number): ImageData {
  return { data: new Uint8ClampedArray(data), width, height } as ImageData;
}

describe("computeAverageLuminance", () => {
  it("returns white luminance for empty or fully transparent images", () => {
    expect(computeAverageLuminance(imageData([], 0, 0))).toBe(1);
    expect(computeAverageLuminance(imageData([0, 0, 0, 0], 1, 1))).toBe(1);
  });

  it("computes linearized luminance across visible pixels", () => {
    expect(computeAverageLuminance(imageData([0, 0, 0, 255], 1, 1))).toBe(0);
    expect(computeAverageLuminance(imageData([255, 255, 255, 255], 1, 1))).toBeCloseTo(1);
    expect(
      computeAverageLuminance(imageData([255, 255, 255, 255, 0, 0, 0, 255], 2, 1)),
    ).toBeCloseTo(0.5);
  });
});
