import { addAsset } from "@/lib/assets-db";
import { installMockIndexedDbAssets } from "@/lib/__testutils__/mockIndexedDbAssets";

describe("addAsset", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("writes the record via store.put and resolves on tx completion", async () => {
    jest.spyOn(Date, "now").mockReturnValue(123);
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });

    const blob = new Blob(["x"], { type: "image/png" });
    await expect(
      addAsset("a1", blob, { name: "img.png", mimeType: "image/png", width: 10, height: 20 }),
    ).resolves.toBeUndefined();

    expect(harness.assetsStore.put).toHaveBeenCalledWith({
      id: "a1",
      createdAt: 123,
      name: "img.png",
      mimeType: "image/png",
      width: 10,
      height: 20,
      blob,
    });

    harness.cleanup();
  });

  it("rejects when the transaction errors with tx.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    harness.assetsStore.failNextTransaction(new Error("tx-failed"));

    const blob = new Blob(["x"], { type: "image/png" });
    await expect(
      addAsset("a1", blob, { name: "img.png", mimeType: "image/png", width: 10, height: 20 }),
    ).rejects.toThrow("tx-failed");

    harness.cleanup();
  });

  it("rejects with a default error when the transaction errors without tx.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbAssets({ hasAssetsStore: true });
    harness.assetsStore.failNextTransaction(undefined);

    const blob = new Blob(["x"], { type: "image/png" });
    await expect(
      addAsset("a1", blob, { name: "img.png", mimeType: "image/png", width: 10, height: 20 }),
    ).rejects.toThrow("Failed to add asset");

    harness.cleanup();
  });
});

