import type { AssetRecordWithBlob } from "@/lib/assets-db";

import { deleteAssets, getAllAssetsWithBlobs } from "@/lib/assets-db";
import { installMockIndexedDbAssets } from "@/lib/__testutils__/mockIndexedDbAssets";

describe("deleteAssets", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns early when ids is empty", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    await deleteAssets([]);
    expect(harness.open).not.toHaveBeenCalled();
    harness.cleanup();
  });

  it("deletes assets and resolves on tx completion", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    const initial: AssetRecordWithBlob[] = [
      { id: "a", name: "a", mimeType: "image/png", width: 1, height: 1, createdAt: 1, blob },
      { id: "b", name: "b", mimeType: "image/png", width: 1, height: 1, createdAt: 1, blob },
    ];
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true, initialAssets: initial });

    await expect(deleteAssets(["a", "b"])).resolves.toBeUndefined();
    await expect(getAllAssetsWithBlobs()).resolves.toEqual([]);

    harness.cleanup();
  });

  it("rejects when the transaction errors with tx.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    harness.assetsStore.failNextTransaction(new Error("tx-failed"));

    await expect(deleteAssets(["a"])).rejects.toThrow("tx-failed");
    harness.cleanup();
  });

  it("rejects with a default error when the transaction errors without tx.error", async () => {
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    harness.assetsStore.failNextTransaction(undefined);

    await expect(deleteAssets(["a"])).rejects.toThrow("Failed to delete assets");
    harness.cleanup();
  });
});

