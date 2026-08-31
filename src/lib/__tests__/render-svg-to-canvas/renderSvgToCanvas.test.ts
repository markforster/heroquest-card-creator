import { renderSvgToCanvas } from "@/lib/render-svg-to-canvas";

describe("renderSvgToCanvas", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:svg"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
  });

  it("clones, mutates, rasterizes, and draws an SVG into an existing canvas", async () => {
    const drawImage = jest.fn();
    const canvas = document.createElement("canvas");
    jest.spyOn(canvas, "getContext").mockReturnValue({ drawImage } as never);
    const bitmap = { close: jest.fn() };
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: jest.fn(async () => bitmap),
    });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const debug = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    debug.setAttribute("data-debug-bounds", "true");
    svg.append(debug);
    const mutateSvg = jest.fn();

    await expect(
      renderSvgToCanvas({
        svgElement: svg,
        width: 100,
        height: 200,
        existingCanvas: canvas,
        mutateSvg,
      }),
    ).resolves.toBe(canvas);

    expect(mutateSvg).toHaveBeenCalledWith(expect.any(SVGSVGElement));
    expect(mutateSvg.mock.calls[0][0].querySelector("[data-debug-bounds]")).toBeNull();
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 100, 200);
    expect(bitmap.close).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:svg");
  });
});
