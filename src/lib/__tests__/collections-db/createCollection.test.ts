import { createCollection } from "@/lib/collections-db";

import { installMockIndexedDbCollections } from "@/lib/__testutils__/mockIndexedDbCollections";

describe("createCollection", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a collection with defaults and persists via store.add", async () => {
    jest.spyOn(Date, "now").mockReturnValue(123);
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });

    const record = await createCollection({ name: "My Collection" });

    expect(record).toEqual({
      id: expect.any(String),
      name: "My Collection",
      description: undefined,
      cardIds: [],
      createdAt: 123,
      updatedAt: 123,
      schemaVersion: 1,
    });

    expect(harness.collectionsStore.add).toHaveBeenCalledWith(record);
    harness.cleanup();
  });

  it("rejects when the collections store is missing", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: false, triggerUpgrade: false });

    await expect(createCollection({ name: "X" })).rejects.toThrow("Collections store not available");
    harness.cleanup();
  });

  it("rejects when store.add fails with request.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("add", new Error("add-failed"));

    await expect(createCollection({ name: "X" })).rejects.toThrow("add-failed");
    harness.cleanup();
  });

  it("rejects with a default error when store.add fails without request.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("add", undefined);

    await expect(createCollection({ name: "X" })).rejects.toThrow("Failed to create collection");
    harness.cleanup();
  });
});
