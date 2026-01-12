import { getAssetBlob } from "@/lib/assets-db";
import { installMockIndexedDbAssets } from "@/lib/__testutils__/mockIndexedDbAssets";

describe("getAssetBlob", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null when the asset is missing", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    await expect(getAssetBlob("missing")).resolves.toBeNull();
    harness.cleanup();
  });

  it("returns the blob when present", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    const harness = installMockIndexedDbAssets({
      hasAssetsStore: true,
      initialAssets: [
        { id: "a1", name: "a", mimeType: "image/png", width: 1, height: 1, createdAt: 1, blob },
      ],
    });

    await expect(getAssetBlob("a1")).resolves.toBe(blob);
    harness.cleanup();
  });

  it("rejects with a default error when store.get fails without request.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    harness.assetsStore.failNextRequest("get", undefined);

    await expect(getAssetBlob("a1")).rejects.toThrow("Failed to load asset blob");
    harness.cleanup();
  });
});

