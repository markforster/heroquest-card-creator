import { getAllAssets } from "@/lib/assets-db";
import { installMockIndexedDbAssets } from "@/lib/__testutils__/mockIndexedDbAssets";

describe("getAllAssets", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses createdAt index when available", async () => {
    const harness = installMockIndexedDbAssets({
      hasAssetsStore: true,
      hasCreatedAtIndex: true,
      initialAssets: [
        { id: "a1", name: "a", mimeType: "x", width: 1, height: 1, createdAt: 1 },
      ],
    });

    await expect(getAllAssets()).resolves.toHaveLength(1);
    expect(harness.assetsStore.index).toHaveBeenCalledWith("createdAt");
    expect(harness.assetsStore.getAll).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it("falls back to store.getAll when createdAt index is missing", async () => {
    const harness = installMockIndexedDbAssets({
      hasAssetsStore: true,
      hasCreatedAtIndex: false,
      initialAssets: [
        { id: "a1", name: "a", mimeType: "x", width: 1, height: 1, createdAt: 1 },
      ],
    });

    await expect(getAllAssets()).resolves.toHaveLength(1);
    expect(harness.assetsStore.getAll).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });

  it("rejects when getAll fails with request.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true, hasCreatedAtIndex: false });
    harness.assetsStore.failNextRequest("getAll", new Error("getAll-failed"));

    await expect(getAllAssets()).rejects.toThrow("getAll-failed");
    harness.cleanup();
  });

  it("rejects with a default error when getAll fails without request.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true, hasCreatedAtIndex: false });
    harness.assetsStore.failNextRequest("getAll", undefined);

    await expect(getAllAssets()).rejects.toThrow("Failed to load assets");
    harness.cleanup();
  });

  it("rejects when index.getAll fails with request.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true, hasCreatedAtIndex: true });
    harness.assetsStore.failNextRequest("indexGetAll", new Error("index-failed"));

    await expect(getAllAssets()).rejects.toThrow("index-failed");
    harness.cleanup();
  });

  it("rejects with a default error when index.getAll fails without request.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true, hasCreatedAtIndex: true });
    harness.assetsStore.failNextRequest("indexGetAll", undefined);

    await expect(getAllAssets()).rejects.toThrow("Failed to load assets");
    harness.cleanup();
  });
});

