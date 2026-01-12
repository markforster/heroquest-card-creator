import { getAllAssetsWithBlobs } from "@/lib/assets-db";
import { installMockIndexedDbAssets } from "@/lib/__testutils__/mockIndexedDbAssets";

describe("getAllAssetsWithBlobs", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns records with blobs", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    const harness = installMockIndexedDbAssets({
      hasAssetsStore: true,
      hasCreatedAtIndex: false,
      initialAssets: [
        { id: "a1", name: "a", mimeType: "image/png", width: 1, height: 1, createdAt: 1, blob },
      ],
    });

    const results = await getAllAssetsWithBlobs();
    expect(results).toHaveLength(1);
    expect(results[0]?.blob).toBe(blob);

    harness.cleanup();
  });

  it("rejects with a default error when getAll fails without request.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true, hasCreatedAtIndex: false });
    harness.assetsStore.failNextRequest("getAll", undefined);

    await expect(getAllAssetsWithBlobs()).rejects.toThrow("Failed to load asset blobs");
    harness.cleanup();
  });
});

