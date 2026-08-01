jest.mock("pica", () => ({
  __esModule: true,
  default: jest.fn(() => ({ resize: jest.fn() })),
}));

import pica from "pica";

import { optimizeImageBlob } from "@/lib/image-optimization";

describe("optimizeImageBlob", () => {
  const mockPica = jest.mocked(pica);
  const resize = mockPica.mock.results[0]?.value.resize as jest.Mock;
  const drawImage = jest.fn();
  const close = jest.fn();
  const outputBlob = new Blob(["optimized"], { type: "image/jpeg" });

  beforeEach(() => {
    resize.mockReset().mockResolvedValue(undefined);
    drawImage.mockReset();
    close.mockReset();
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: jest.fn().mockResolvedValue({ width: 800, height: 400, close }),
    });
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as never);
    jest.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(outputBlob);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resizes an oversized image and applies clamped JPEG quality", async () => {
    const input = new Blob(["original"], { type: "image/jpeg" });
    const toBlob = jest.spyOn(HTMLCanvasElement.prototype, "toBlob");

    await expect(optimizeImageBlob(input, { maxDimension: 200, jpegQuality: 4 })).resolves.toEqual({
      blob: outputBlob,
      width: 200,
      height: 100,
      originalBytes: input.size,
      optimizedBytes: outputBlob.size,
    });

    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledTimes(1);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 1);
  });

  it("keeps the original dimensions and omits quality for PNG output", async () => {
    const input = new Blob(["original"], { type: "image/png" });
    const toBlob = jest.spyOn(HTMLCanvasElement.prototype, "toBlob");

    const result = await optimizeImageBlob(input, {
      maxDimension: Number.NaN,
      jpegQuality: Number.NaN,
    });

    expect(result).toMatchObject({ width: 800, height: 400 });
    expect(resize).not.toHaveBeenCalled();
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png", undefined);
  });

  it("releases the decoded image before reporting a missing canvas context", async () => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    await expect(optimizeImageBlob(new Blob(["original"]), { maxDimension: 200 })).rejects.toThrow(
      "Failed to create canvas context",
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("rejects when the browser cannot encode the output canvas", async () => {
    jest.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(null);
    });

    await expect(optimizeImageBlob(new Blob(["original"]), { jpegQuality: 0 })).rejects.toThrow(
      "Failed to encode image",
    );
  });
});
