import { extractPaletteFromCanvas } from "@/lib/color-palette";

function createCanvas(width: number, height: number, pixels: Uint8ClampedArray): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  jest.spyOn(canvas, "getContext").mockReturnValue({
    getImageData: () => ({ data: pixels }),
  } as never);
  return canvas;
}

describe("extractPaletteFromCanvas", () => {
  it("returns no colors when a drawing context is unavailable", () => {
    const canvas = document.createElement("canvas");
    jest.spyOn(canvas, "getContext").mockReturnValue(null);

    expect(extractPaletteFromCanvas(canvas)).toEqual([]);
  });

  it("returns distinct representative colors ordered by prevalence", () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255,
    ]);
    const canvas = createCanvas(4, 1, pixels);

    expect(
      extractPaletteFromCanvas(canvas, {
        insetPercent: 0,
        sampleStride: 1,
        maxColors: 2,
      }),
    ).toEqual(["#FF0000", "#0000FF"]);
  });

  it("retries with relaxed thresholds for a low-saturation image", () => {
    const pixels = new Uint8ClampedArray([130, 110, 110, 255]);
    const canvas = createCanvas(1, 1, pixels);

    expect(
      extractPaletteFromCanvas(canvas, {
        insetPercent: 0,
        sampleStride: 1,
      }),
    ).toEqual(["#826E6E"]);
  });

  it("ignores transparent pixels", () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 0]);
    const canvas = createCanvas(1, 1, pixels);

    expect(
      extractPaletteFromCanvas(canvas, {
        insetPercent: 0,
        sampleStride: 1,
      }),
    ).toEqual([]);
  });
});
