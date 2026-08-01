const renderSvgToCanvas = jest.fn();
const composeBleedCanvas = jest.fn();
const mutateSvgForExport = jest.fn();

jest.mock("@/lib/render-svg-to-canvas", () => ({
  renderSvgToCanvas: (...args: unknown[]) => renderSvgToCanvas(...args),
}));
jest.mock("@/lib/bleed-export", () => ({
  composeBleedCanvas: (...args: unknown[]) => composeBleedCanvas(...args),
}));
jest.mock("@/components/Cards/CardPreview/cardPreviewExportSvg", () => ({
  mutateSvgForExport: (...args: unknown[]) => mutateSvgForExport(...args),
}));
jest.mock("@/lib/watermark", () => ({
  shouldApplyWatermark: () => false,
  applyWatermarkToCanvas: jest.fn(),
}));

import { renderBleedCanvas } from "@/components/Cards/CardPreview/cardPreviewBleedCanvas";

describe("renderBleedCanvas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when the full SVG render fails", async () => {
    renderSvgToCanvas.mockResolvedValue(null);

    await expect(
      renderBleedCanvas({
        svgElement: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
        bleedPx: 0,
        roundedCorners: true,
      }),
    ).resolves.toBeNull();
    expect(composeBleedCanvas).not.toHaveBeenCalled();
  });

  it("renders full and bleed-source canvases before composition", async () => {
    const fullCanvas = document.createElement("canvas");
    const sourceCanvas = document.createElement("canvas");
    const outputCanvas = document.createElement("canvas");
    renderSvgToCanvas.mockResolvedValueOnce(fullCanvas).mockResolvedValueOnce(sourceCanvas);
    composeBleedCanvas.mockReturnValue(outputCanvas);

    await expect(
      renderBleedCanvas({
        svgElement: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
        bleedPx: 12,
        cropMarks: { enabled: true, color: "#00FFFF" },
        cutMarks: { enabled: true, color: "#111111", style: "dotted" },
        roundedCorners: false,
      }),
    ).resolves.toBe(outputCanvas);
    expect(renderSvgToCanvas).toHaveBeenCalledTimes(2);
    expect(composeBleedCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        fullCanvas,
        backgroundCanvas: sourceCanvas,
        bleedPx: 12,
      }),
    );
  });
});
