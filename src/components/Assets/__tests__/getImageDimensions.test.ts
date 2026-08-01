import getImageDimensions from "@/components/Assets/getImageDimensions";

describe("getImageDimensions", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  });

  it("uses ImageBitmap dimensions and releases the bitmap", async () => {
    const close = jest.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: jest.fn().mockResolvedValue({ width: 640, height: 480, close }),
    });

    await expect(getImageDimensions(new File(["image"], "image.png"))).resolves.toEqual({
      width: 640,
      height: 480,
    });
    expect(close).toHaveBeenCalled();
  });

  it("falls back to an image element and always revokes its object URL", async () => {
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:image"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    class TestImage {
      naturalWidth = 320;
      naturalHeight = 200;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, "Image", { configurable: true, value: TestImage });

    await expect(getImageDimensions(new File(["image"], "image.png"))).resolves.toEqual({
      width: 320,
      height: 200,
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:image");
  });
});
