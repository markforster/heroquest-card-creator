import type { CollectionRecord } from "@/types/collections-db";

import { listCollections } from "@/lib/collections-db";

import { installMockIndexedDbCollections } from "@/lib/__testutils__/mockIndexedDbCollections";

describe("listCollections", () => {
  it("returns an empty list when there are no collections", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    await expect(listCollections()).resolves.toEqual([]);
    harness.cleanup();
  });

  it("iterates cursor results and returns case-insensitively sorted collections", async () => {
    const a: CollectionRecord = {
      id: "a",
      name: "apple",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };
    const b: CollectionRecord = {
      id: "b",
      name: "Banana",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };
    const c: CollectionRecord = {
      id: "c",
      name: "cherry",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };

    const harness = installMockIndexedDbCollections({
      hasCollectionsStore: true,
      initialCollections: [c, b, a],
    });

    await expect(listCollections()).resolves.toEqual([a, b, c]);
    harness.cleanup();
  });

  it("rejects when the collections store is missing", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: false, triggerUpgrade: false });

    await expect(listCollections()).rejects.toThrow("Collections store not available");
    harness.cleanup();
  });

  it("rejects when openCursor fails", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("openCursor", new Error("cursor-failed"));

    await expect(listCollections()).rejects.toThrow("cursor-failed");
    harness.cleanup();
  });

  it("rejects with a default error when openCursor fails without request.error", async () => {
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("openCursor", undefined);

    await expect(listCollections()).rejects.toThrow("Failed to list collections");
    harness.cleanup();
  });
});
