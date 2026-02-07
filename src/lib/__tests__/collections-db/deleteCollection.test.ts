import type { CollectionRecord } from "@/types/collections-db";

import { deleteCollection, getCollection } from "@/lib/collections-db";

import { installMockIndexedDbCollections } from "@/lib/__testutils__/mockIndexedDbCollections";

describe("deleteCollection", () => {
  it("deletes an existing collection", async () => {
    const existing: CollectionRecord = {
      id: "c1",
      name: "To delete",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };

    const harness = installMockIndexedDbCollections({
      hasCollectionsStore: true,
      initialCollections: [existing],
    });

    await deleteCollection("c1");
    expect(harness.collectionsStore.delete).toHaveBeenCalledWith("c1");
    await expect(getCollection("c1")).resolves.toBeNull();

    harness.cleanup();
  });

  it("rejects when the collections store is missing", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: false, triggerUpgrade: false });

    await expect(deleteCollection("c1")).rejects.toThrow("Collections store not available");
    harness.cleanup();
  });

  it("rejects when store.delete fails", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("delete", new Error("delete-failed"));

    await expect(deleteCollection("c1")).rejects.toThrow("delete-failed");
    harness.cleanup();
  });

  it("rejects with a default error when store.delete fails without request.error", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("delete", undefined);

    await expect(deleteCollection("c1")).rejects.toThrow("Failed to delete collection");
    harness.cleanup();
  });
});
