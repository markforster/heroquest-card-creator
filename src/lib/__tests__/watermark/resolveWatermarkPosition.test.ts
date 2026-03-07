import { resolveWatermarkPosition } from "@/lib/watermark";

describe("resolveWatermarkPosition", () => {
  it("returns expected default position for 756x1056", () => {
    const { x, y } = resolveWatermarkPosition(756, 1056);
    expect({ x, y }).toEqual({ x: 725, y: 1053 });
  });

  it("scales proportionally for smaller sizes", () => {
    const { x, y } = resolveWatermarkPosition(375, 525);
    expect({ x, y }).toEqual({ x: 360, y: 524 });
  });

  it("clamps to canvas bounds", () => {
    const { x, y } = resolveWatermarkPosition(1, 1);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(0);
  });
});
