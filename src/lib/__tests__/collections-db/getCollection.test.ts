import type { CollectionRecord } from "@/types/collections-db";

import { getCollection } from "@/lib/collections-db";

import { installMockIndexedDbCollections } from "@/lib/__testutils__/mockIndexedDbCollections";

describe("getCollection", () => {
  it("returns null when the collection is missing", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    await expect(getCollection("missing")).resolves.toBeNull();
    harness.cleanup();
  });

  it("returns the collection when present", async () => {
    const existing: CollectionRecord = {
      id: "c1",
      name: "Test",
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

    await expect(getCollection("c1")).resolves.toEqual(existing);
    harness.cleanup();
  });

  it("rejects when the collections store is missing", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: false, triggerUpgrade: false });
    await expect(getCollection("c1")).rejects.toThrow("Collections store not available");
    harness.cleanup();
  });

  it("rejects when store.get fails", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("get", new Error("get-failed"));

    await expect(getCollection("c1")).rejects.toThrow("get-failed");
    harness.cleanup();
  });

  it("rejects with a default error when store.get fails without request.error", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("get", undefined);

    await expect(getCollection("c1")).rejects.toThrow("Failed to load collection");
    harness.cleanup();
  });
});
