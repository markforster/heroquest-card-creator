import { composeBleedCanvas } from "@/lib/bleed-export";
import { CARD_HEIGHT, CARD_WIDTH } from "@/components/Cards/CardPreview/consts";

type MockCanvas = {
  width: number;
  height: number;
  getContext: jest.Mock;
};

function makeMockContext() {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    stroke: jest.fn(),
    setLineDash: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
  };
}

function makeMockCanvas(ctx: ReturnType<typeof makeMockContext>): MockCanvas {
  return {
    width: 0,
    height: 0,
    getContext: jest.fn().mockReturnValue(ctx),
  };
}

describe("composeBleedCanvas", () => {
  it("uses 750x1050 trim geometry and expands by bleed padding", () => {
    const sourceCtx = makeMockContext();
    const sourceCanvas = makeMockCanvas(sourceCtx) as unknown as HTMLCanvasElement;
    sourceCanvas.width = CARD_WIDTH;
    sourceCanvas.height = CARD_HEIGHT;

    const outputCtx = makeMockContext();
    const outputCanvas = makeMockCanvas(outputCtx);

    const createSpy = jest
      .spyOn(document, "createElement")
      .mockReturnValueOnce(outputCanvas as unknown as HTMLCanvasElement);

    const result = composeBleedCanvas({
      fullCanvas: sourceCanvas,
      backgroundCanvas: sourceCanvas,
      bleedPx: 12,
    });

    expect(result.width).toBe(CARD_WIDTH + 24);
    expect(result.height).toBe(CARD_HEIGHT + 24);
    expect(outputCtx.drawImage).toHaveBeenCalledWith(sourceCanvas, 12, 12, CARD_WIDTH, CARD_HEIGHT);

    createSpy.mockRestore();
  });

  it("keeps identical output dimensions whether bleed bands are rendered or not", () => {
    const sourceCtx = makeMockContext();
    const sourceCanvas = makeMockCanvas(sourceCtx) as unknown as HTMLCanvasElement;
    sourceCanvas.width = CARD_WIDTH;
    sourceCanvas.height = CARD_HEIGHT;

    const outputCtxA = makeMockContext();
    const outputCanvasA = makeMockCanvas(outputCtxA);
    const outputCtxB = makeMockContext();
    const outputCanvasB = makeMockCanvas(outputCtxB);

    const createSpy = jest
      .spyOn(document, "createElement")
      .mockReturnValueOnce(outputCanvasA as unknown as HTMLCanvasElement)
      .mockReturnValueOnce(outputCanvasB as unknown as HTMLCanvasElement);

    const withBands = composeBleedCanvas({
      fullCanvas: sourceCanvas,
      backgroundCanvas: sourceCanvas,
      bleedPx: 12,
      renderBleedBands: true,
      cropMarks: { enabled: true, color: "#00ffff", markLength: 10 },
      cutMarks: { enabled: true, color: "#00ffff", offset: 2, thickness: 1 },
    });

    const withoutBands = composeBleedCanvas({
      fullCanvas: sourceCanvas,
      backgroundCanvas: sourceCanvas,
      bleedPx: 12,
      renderBleedBands: false,
      cropMarks: { enabled: true, color: "#00ffff", markLength: 10 },
      cutMarks: { enabled: true, color: "#00ffff", offset: 2, thickness: 1 },
    });

    expect(withBands.width).toBe(withoutBands.width);
    expect(withBands.height).toBe(withoutBands.height);

    // Crop marks are still drawn in both modes (additional fillRect calls beyond white background).
    expect(outputCtxA.fillRect.mock.calls.length).toBeGreaterThan(1);
    expect(outputCtxB.fillRect.mock.calls.length).toBeGreaterThan(1);

    createSpy.mockRestore();
  });

  it("skips mirrored bleed draw calls when renderBleedBands is false", () => {
    const sourceCtx = makeMockContext();
    const sourceCanvas = makeMockCanvas(sourceCtx) as unknown as HTMLCanvasElement;
    sourceCanvas.width = CARD_WIDTH;
    sourceCanvas.height = CARD_HEIGHT;

    const outputCtxA = makeMockContext();
    const outputCanvasA = makeMockCanvas(outputCtxA);
    const outputCtxB = makeMockContext();
    const outputCanvasB = makeMockCanvas(outputCtxB);

    const createSpy = jest
      .spyOn(document, "createElement")
      .mockReturnValueOnce(outputCanvasA as unknown as HTMLCanvasElement)
      .mockReturnValueOnce(outputCanvasB as unknown as HTMLCanvasElement);

    composeBleedCanvas({
      fullCanvas: sourceCanvas,
      backgroundCanvas: sourceCanvas,
      bleedPx: 12,
      renderBleedBands: true,
    });

    composeBleedCanvas({
      fullCanvas: sourceCanvas,
      backgroundCanvas: sourceCanvas,
      bleedPx: 12,
      renderBleedBands: false,
    });

    // With bands: many mirrored drawImage calls + one main draw.
    expect(outputCtxA.drawImage.mock.calls.length).toBeGreaterThan(1);
    // Without bands: only main card draw.
    expect(outputCtxB.drawImage.mock.calls.length).toBe(1);

    createSpy.mockRestore();
  });
});
