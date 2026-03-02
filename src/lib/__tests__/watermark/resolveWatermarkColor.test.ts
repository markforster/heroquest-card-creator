import { resolveWatermarkColor } from "@/lib/watermark";

const makeContext = (width: number, height: number, rgb: [number, number, number]) => {
  const [r, g, b] = rgb;
  const sampleData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < sampleData.length; i += 4) {
    sampleData[i] = r;
    sampleData[i + 1] = g;
    sampleData[i + 2] = b;
    sampleData[i + 3] = 255;
  }

  return {
    canvas: { width, height },
    getImageData: () => ({ data: sampleData }),
  } as unknown as CanvasRenderingContext2D;
};

describe("resolveWatermarkColor", () => {
  it("uses light pixel on dark region", () => {
    const ctx = makeContext(3, 3, [10, 10, 10]);
    expect(resolveWatermarkColor(ctx, 1, 1)).toBe("rgb(245, 240, 230)");
  });

  it("uses dark pixel on light region", () => {
    const ctx = makeContext(3, 3, [250, 250, 250]);
    expect(resolveWatermarkColor(ctx, 1, 1)).toBe("rgb(6, 6, 6)");
  });
});
