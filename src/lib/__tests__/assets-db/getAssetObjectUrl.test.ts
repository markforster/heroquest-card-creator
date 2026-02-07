import { getAssetObjectUrl } from "@/lib/assets-db";
import { installMockIndexedDbAssets } from "@/lib/__testutils__/mockIndexedDbAssets";

describe("getAssetObjectUrl", () => {
  const originalCreateDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCreateDescriptor) {
      Object.defineProperty(URL, "createObjectURL", originalCreateDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (URL as any).createObjectURL;
    }
  });

  it("returns null when the asset is missing", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    await expect(getAssetObjectUrl("missing")).resolves.toBeNull();
    harness.cleanup();
  });

  it("returns null when the asset has no blob", async () => {
    const harness = installMockIndexedDbAssets({
      hasAssetsStore: true,
      initialAssets: [{ id: "a1", name: "a", mimeType: "x", width: 1, height: 1, createdAt: 1 }],
    });

    await expect(getAssetObjectUrl("a1")).resolves.toBeNull();
    harness.cleanup();
  });

  it("returns a blob URL when the asset has a blob", async () => {
    const createSpy = jest.fn(() => "blob:asset");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createSpy });

    const blob = new Blob(["x"], { type: "image/png" });
    const harness = installMockIndexedDbAssets({
      hasAssetsStore: true,
      initialAssets: [
        { id: "a1", name: "a", mimeType: "image/png", width: 1, height: 1, createdAt: 1, blob },
      ],
    });

    await expect(getAssetObjectUrl("a1")).resolves.toBe("blob:asset");
    expect(createSpy).toHaveBeenCalledWith(blob);

    harness.cleanup();
  });

  it("rejects with a default error when store.get fails without request.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    harness.assetsStore.failNextRequest("get", undefined);

    await expect(getAssetObjectUrl("a1")).rejects.toThrow("Failed to load asset blob");
    harness.cleanup();
  });
});

