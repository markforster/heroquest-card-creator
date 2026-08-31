import { CARD_HEIGHT, CARD_WIDTH } from "@/components/Cards/CardPreview/consts";
import {
  cloneSvgForBleed,
  composeBleedCanvas,
  setExportBackgroundFit,
  stripToBackgroundOnly,
  stripToBleedSource,
} from "@/lib/bleed-export";

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
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    arc: jest.fn(),
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

describe("bleed SVG preparation", () => {
  const parseSvg = (content: string) => {
    const host = document.createElement("div");
    host.innerHTML = `<svg>${content}</svg>`;
    return host.querySelector("svg") as SVGSVGElement;
  };

  it("removes clipping definitions and attributes", () => {
    const svg = parseSvg(
      '<defs><clipPath id="clip"><rect /></clipPath></defs><g clip-path="url(#clip)"><rect /></g>',
    );

    cloneSvgForBleed(svg);

    expect(svg.querySelector("clipPath")).toBeNull();
    expect(svg.querySelector("g")?.hasAttribute("clip-path")).toBe(false);
  });

  it("sets the background image fit mode", () => {
    const svg = parseSvg('<image data-card-background="true" />');

    setExportBackgroundFit(svg, "slice");

    expect(svg.querySelector("image")?.getAttribute("preserveAspectRatio")).toBe("xMidYMid slice");
  });

  it("retains only the background ancestry and definitions", () => {
    const svg = parseSvg(
      '<defs><linearGradient id="g" /></defs><g id="background"><image data-card-background="true" /></g><text>remove</text>',
    );

    stripToBackgroundOnly(svg);

    expect(svg.querySelector("#background")).not.toBeNull();
    expect(svg.querySelector("defs")).not.toBeNull();
    expect(svg.querySelector("text")).toBeNull();
  });

  it("retains background and user artwork for the bleed source", () => {
    const svg = parseSvg(
      '<g id="background"><image data-card-background="true" /></g><g id="art"><image data-user-asset-id="asset-1" /></g><text>remove</text>',
    );

    stripToBleedSource(svg);

    expect(svg.querySelector("#background")).not.toBeNull();
    expect(svg.querySelector("#art")).not.toBeNull();
    expect(svg.querySelector("text")).toBeNull();
  });
});
