const composeBleedCanvas = jest.fn();

jest.mock("@/lib/bleed-export", () => ({
  composeBleedCanvas: (...args: unknown[]) => composeBleedCanvas(...args),
}));

import { renderPdfPlaceholderFacePngBytes } from "@/components/Export/pdfExportFaceRendering";
import { DEFAULT_PDF_PRINT_CONFIG } from "@/lib/export-settings";

describe("renderPdfPlaceholderFacePngBytes", () => {
  const context = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    textAlign: "start",
    textBaseline: "alphabetic",
    font: "",
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    roundRect: jest.fn(),
    stroke: jest.fn(),
    fillText: jest.fn(),
  };

  const makeCanvas = () => ({
    width: 0,
    height: 0,
    getContext: jest.fn(() => context),
    toBlob: jest.fn((callback: (blob: { arrayBuffer: () => Promise<ArrayBuffer> }) => void) =>
      callback({ arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer }),
    ),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("draws the placeholder title and optional subtitle", async () => {
    const canvas = makeCanvas();
    jest.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLElement);

    const result = await renderPdfPlaceholderFacePngBytes({
      spec: { title: "Missing front", subtitle: "Card unavailable", variant: "empty-front" },
      configForRun: DEFAULT_PDF_PRINT_CONFIG,
      shellState: {
        resolvedBleedOptions: {
          bleedPx: 0,
          cropMarks: { enabled: false, color: "#000000", style: "lines" },
          cutMarks: { enabled: false, color: "#000000", style: "solid" },
          roundedCorners: true,
        },
      } as never,
    });

    expect(context.fillText).toHaveBeenCalledWith(
      "Missing front",
      canvas.width / 2,
      canvas.height * 0.45,
    );
    expect(context.fillText).toHaveBeenCalledWith(
      "Card unavailable",
      canvas.width / 2,
      canvas.height * 0.55,
    );
    expect(result).toEqual(Uint8Array.from([1, 2, 3]));
    expect(composeBleedCanvas).not.toHaveBeenCalled();
  });

  it("applies baked-in bleed before encoding", async () => {
    const baseCanvas = makeCanvas();
    const bleedCanvas = makeCanvas();
    jest.spyOn(document, "createElement").mockReturnValue(baseCanvas as unknown as HTMLElement);
    composeBleedCanvas.mockReturnValue(bleedCanvas);

    await renderPdfPlaceholderFacePngBytes({
      spec: { title: "Empty", variant: "empty-front" },
      configForRun: DEFAULT_PDF_PRINT_CONFIG,
      shellState: {
        resolvedBleedOptions: {
          bleedPx: 12,
          cropMarks: { enabled: true, color: "#00FFFF", style: "lines" },
          cutMarks: { enabled: false, color: "#00FFFF", style: "solid" },
          roundedCorners: true,
        },
      } as never,
    });

    expect(composeBleedCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        fullCanvas: baseCanvas,
        backgroundCanvas: baseCanvas,
        bleedPx: 12,
      }),
    );
    expect(bleedCanvas.toBlob).toHaveBeenCalled();
  });

  it("returns null when a drawing context is unavailable", async () => {
    const canvas = makeCanvas();
    (canvas.getContext as jest.Mock).mockReturnValue(null);
    jest.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLElement);

    await expect(
      renderPdfPlaceholderFacePngBytes({
        spec: { title: "Empty", variant: "empty-front" },
        configForRun: DEFAULT_PDF_PRINT_CONFIG,
        shellState: { resolvedBleedOptions: { bleedPx: 0 } } as never,
      }),
    ).resolves.toBeNull();
  });
});
