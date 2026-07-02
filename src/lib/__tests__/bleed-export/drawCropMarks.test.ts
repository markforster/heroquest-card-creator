import { drawCropMarks } from "@/lib/bleed-export";

function makeMockContext() {
  return {
    fillStyle: "",
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
  };
}

describe("drawCropMarks", () => {
  it("extends line crop marks slightly inward while preserving their outer reach", () => {
    const ctx = makeMockContext();

    drawCropMarks(ctx as unknown as CanvasRenderingContext2D, {
      trimX: 20,
      trimY: 30,
      trimW: 750,
      trimH: 1050,
      color: "#00ffff",
      markLength: 20,
      thickness: 2,
      style: "lines",
    });

    expect(ctx.fillStyle).toBe("#00ffff");
    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 0, 28, 25, 2);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(2, 18, 10, 2, 25);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(3, 765, 28, 25, 2);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(4, 770, 10, 2, 25);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(5, 0, 1080, 25, 2);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(6, 18, 1075, 2, 25);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(7, 765, 1080, 25, 2);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(8, 770, 1075, 2, 25);
  });

  it("draws filled right-angle triangles in each corner box", () => {
    const ctx = makeMockContext();

    drawCropMarks(ctx as unknown as CanvasRenderingContext2D, {
      trimX: 20,
      trimY: 30,
      trimW: 750,
      trimH: 1050,
      color: "#00ffff",
      markLength: 10,
      style: "triangles",
    });

    expect(ctx.fillStyle).toBe("#00ffff");
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.beginPath).toHaveBeenCalledTimes(4);
    expect(ctx.closePath).toHaveBeenCalledTimes(4);
    expect(ctx.fill).toHaveBeenCalledTimes(4);

    expect(ctx.moveTo).toHaveBeenNthCalledWith(1, 20, 30);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 10, 30);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(2, 20, 20);

    expect(ctx.moveTo).toHaveBeenNthCalledWith(4, 770, 1080);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(7, 780, 1080);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(8, 770, 1090);
  });
});
