import { prepareAssetKindInput } from "@/lib/asset-kind/prepare";

describe("prepareAssetKindInput", () => {
  const drawImage = jest.fn();
  const close = jest.fn();
  const imageData = { data: new Uint8ClampedArray(128 * 128 * 4) } as ImageData;
  const context = {
    drawImage,
    getImageData: jest.fn(() => imageData),
  } as never;

  beforeEach(() => {
    drawImage.mockReset();
    close.mockReset();
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  });

  it("uses ImageBitmap when available and preserves original dimensions", async () => {
    const bitmap = { width: 640, height: 480, close };
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: jest.fn().mockResolvedValue(bitmap),
    });

    await expect(
      prepareAssetKindInput(new Blob(["image"]), { width: 640, height: 480 }),
    ).resolves.toEqual({
      imageData,
      width: 128,
      height: 128,
      originalWidth: 640,
      originalHeight: 480,
    });
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 128, 128);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes the bitmap before reporting a missing canvas context", async () => {
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: jest.fn().mockResolvedValue({ width: 1, height: 1, close }),
    });
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    await expect(prepareAssetKindInput(new Blob(["image"]))).rejects.toThrow(
      "Canvas context not available",
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("falls back to an image element and revokes its object URL", async () => {
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:test"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    class TestImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: TestImage,
    });

    const result = await prepareAssetKindInput(new Blob(["image"]));

    expect(result).toMatchObject({ width: 128, height: 128 });
    expect(drawImage).toHaveBeenCalledWith(expect.any(TestImage), 0, 0, 128, 128);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
