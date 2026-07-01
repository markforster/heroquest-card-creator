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
