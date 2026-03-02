import { applyWatermarkToCanvas, resolveWatermarkColor } from "@/lib/watermark";

jest.mock("@/lib/watermark", () => {
  const original = jest.requireActual("@/lib/watermark");
  return {
    ...original,
    resolveWatermarkColor: jest.fn(() => "rgb(6, 6, 6)"),
  };
});

describe("applyWatermarkToCanvas", () => {
  it("draws five horizontal dots at 25% alpha with 1px gaps", () => {
    const fillCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
    const save = jest.fn();
    const restore = jest.fn();
    const context: Partial<CanvasRenderingContext2D> = {
      canvas: { width: 10, height: 10 } as HTMLCanvasElement,
      fillStyle: "",
      globalAlpha: 1,
      save,
      restore,
      fillRect: (x: number, y: number, w: number, h: number) => {
        fillCalls.push({ x, y, w, h });
      },
      getImageData: () => ({ data: new Uint8ClampedArray(4) }) as ImageData,
    };

    const canvas = {
      width: 10,
      height: 10,
      getContext: () => context as CanvasRenderingContext2D,
    } as HTMLCanvasElement;

    applyWatermarkToCanvas(canvas);

    expect(resolveWatermarkColor).toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledTimes(1);
    expect((context as CanvasRenderingContext2D).globalAlpha).toBe(0.25);

    const ys = new Set(fillCalls.map((call) => call.y));
    expect(ys.size).toBe(1);
    const xs = fillCalls.map((call) => call.x);
    expect(xs).toEqual([9, 7, 5, 3, 1]);
    fillCalls.forEach((call) => {
      expect(call.w).toBe(1);
      expect(call.h).toBe(1);
    });
  });
});
