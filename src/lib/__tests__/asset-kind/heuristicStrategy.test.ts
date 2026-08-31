import { heuristicStrategy } from "@/lib/asset-kind/heuristic";

class TestImageData {
  constructor(public readonly data: Uint8ClampedArray) {}
}

function createSolidImage(width: number, height: number, color: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data.set(color, offset);
  }
  return data;
}

describe("heuristicStrategy", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "ImageData", {
      configurable: true,
      value: TestImageData,
    });
  });

  it("returns unknown with no confidence for incomplete pixel data", async () => {
    await expect(
      heuristicStrategy({
        imageData: new Uint8ClampedArray(3),
        width: 1,
        height: 1,
      }),
    ).resolves.toEqual({
      kind: "unknown",
      confidence: 0,
      source: "heuristic",
    });
  });

  it("classifies a small, low-color grayscale image as an icon", async () => {
    const result = await heuristicStrategy({
      imageData: createSolidImage(10, 10, [32, 32, 32, 255]),
      width: 10,
      height: 10,
      originalWidth: 100,
      originalHeight: 100,
    });

    expect(result.kind).toBe("icon");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.source).toBe("heuristic");
  });

  it("classifies a small, saturated color image as artwork", async () => {
    const result = await heuristicStrategy({
      imageData: createSolidImage(10, 10, [255, 0, 0, 255]),
      width: 10,
      height: 10,
      originalWidth: 100,
      originalHeight: 100,
    });

    expect(result.kind).toBe("artwork");
    expect(result.confidence).toBeGreaterThan(0);
  });
});
