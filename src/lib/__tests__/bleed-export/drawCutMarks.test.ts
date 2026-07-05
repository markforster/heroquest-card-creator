import {
  DEFAULT_CROP_MARK_THICKNESS,
  DEFAULT_CUT_MARK_OFFSET,
  DEFAULT_CUT_MARK_RADIUS_ADJUST,
  drawCutMarks,
} from "@/lib/bleed-export";
import { CARD_CORNER_RADIUS } from "@/components/Cards/CardPreview/consts";

function makeMockContext() {
  return {
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    arc: jest.fn(),
    stroke: jest.fn(),
    setLineDash: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
  };
}

describe("drawCutMarks", () => {
  it("slightly increases the corner radius to better match the printed card shape", () => {
    const ctx = makeMockContext();

    drawCutMarks(ctx as unknown as CanvasRenderingContext2D, {
      trimX: 12,
      trimY: 12,
      trimW: 750,
      trimH: 1050,
      color: "#00ff00",
    });

    const strokeInset = DEFAULT_CROP_MARK_THICKNESS / 2;
    const effectiveOffset = DEFAULT_CUT_MARK_OFFSET + strokeInset;
    const expectedRadius =
      CARD_CORNER_RADIUS + effectiveOffset + DEFAULT_CUT_MARK_RADIUS_ADJUST;

    expect(ctx.moveTo).toHaveBeenCalledWith(12 - effectiveOffset + expectedRadius, 12 - effectiveOffset);
    expect(ctx.quadraticCurveTo).toHaveBeenNthCalledWith(
      1,
      12 - effectiveOffset + 750 + effectiveOffset * 2,
      12 - effectiveOffset,
      12 - effectiveOffset + 750 + effectiveOffset * 2,
      12 - effectiveOffset + expectedRadius,
    );
  });

  it("uses the dashed pattern for dashed cut marks", () => {
    const ctx = makeMockContext();

    drawCutMarks(ctx as unknown as CanvasRenderingContext2D, {
      trimX: 12,
      trimY: 12,
      trimW: 750,
      trimH: 1050,
      color: "#00ff00",
      style: "dashed",
    });

    expect(ctx.setLineDash).toHaveBeenNthCalledWith(1, [10, 6]);
    expect(ctx.lineCap).toBe("butt");
  });

  it("uses round-capped short dashes for dotted cut marks", () => {
    const ctx = makeMockContext();

    drawCutMarks(ctx as unknown as CanvasRenderingContext2D, {
      trimX: 12,
      trimY: 12,
      trimW: 750,
      trimH: 1050,
      color: "#00ff00",
      style: "dotted",
    });

    expect(ctx.setLineDash).toHaveBeenNthCalledWith(1, [1, 5]);
    expect(ctx.lineCap).toBe("round");
  });

  it("draws sparse line and curved arc segments for tick cut marks", () => {
    const ctx = makeMockContext();

    drawCutMarks(ctx as unknown as CanvasRenderingContext2D, {
      trimX: 12,
      trimY: 12,
      trimW: 750,
      trimH: 1050,
      color: "#00ff00",
      style: "ticks",
    });

    expect(ctx.setLineDash).toHaveBeenNthCalledWith(1, []);
    expect(ctx.lineCap).toBe("round");
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(200);

    const firstMove = ctx.moveTo.mock.calls[0];
    const firstLine = ctx.lineTo.mock.calls[0];
    const secondMove = ctx.moveTo.mock.calls[1];
    const secondLine = ctx.lineTo.mock.calls[1];

    expect(firstLine[0]).toBeCloseTo(firstMove[0], 5);
    expect(firstLine[1]).toBeLessThan(firstMove[1]);
    expect(secondLine[0]).toBeCloseTo(secondMove[0], 5);
    expect(secondLine[1]).toBeLessThan(secondMove[1]);

    const diagonalTickIndex = ctx.lineTo.mock.calls.findIndex(
      ([x, y], index) =>
        Math.abs(x - ctx.moveTo.mock.calls[index][0]) > 0.001 &&
        Math.abs(y - ctx.moveTo.mock.calls[index][1]) > 0.001,
    );
    expect(diagonalTickIndex).toBeGreaterThanOrEqual(0);
  });
});
