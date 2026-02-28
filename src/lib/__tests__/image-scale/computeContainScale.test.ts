import { computeContainScale } from "@/lib/image-scale";

describe("computeContainScale", () => {
  it("returns the smaller axis ratio for contain fit", () => {
    const scale = computeContainScale({ x: 0, y: 0, width: 500, height: 300 }, 1000, 200);
    expect(scale).toBeCloseTo(0.5);
  });

  it("returns 1 when dimensions are missing", () => {
    expect(computeContainScale({ x: 0, y: 0, width: 500, height: 300 }, undefined, 200)).toBe(1);
    expect(computeContainScale({ x: 0, y: 0, width: 500, height: 300 }, 200, undefined)).toBe(1);
  });
});
