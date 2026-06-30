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
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
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
});
