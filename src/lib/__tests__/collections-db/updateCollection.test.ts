import type { CollectionRecord } from "@/types/collections-db";

import { updateCollection } from "@/lib/collections-db";

import { installMockIndexedDbCollections } from "@/lib/__testutils__/mockIndexedDbCollections";

describe("updateCollection", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null when the collection does not exist", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    const result = await updateCollection("missing", { name: "New" });
    expect(result).toBeNull();
    harness.cleanup();
  });

  it("updates an existing collection and bumps updatedAt", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const existing: CollectionRecord = {
      id: "c1",
      name: "Old",
      description: "desc",
      cardIds: ["a"],
      createdAt: 100,
      updatedAt: 100,
      schemaVersion: 1,
    };

    const harness = installMockIndexedDbCollections({
      hasCollectionsStore: true,
      initialCollections: [existing],
    });

    const next = await updateCollection("c1", { name: "New", description: undefined });

    expect(next).toEqual({
      ...existing,
      name: "New",
      description: undefined,
      updatedAt: 200,
    });

    expect(harness.collectionsStore.put).toHaveBeenCalledWith(next);
    harness.cleanup();
  });

  it("rejects when the collections store is missing", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: false, triggerUpgrade: false });

    await expect(updateCollection("c1", { name: "New" })).rejects.toThrow(
      "Collections store not available",
    );
    harness.cleanup();
  });

  it("rejects when store.get fails", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("get", new Error("get-failed"));

    await expect(updateCollection("c1", { name: "New" })).rejects.toThrow(
      "get-failed",
    );
    harness.cleanup();
  });

  it("rejects with a default error when store.get fails without request.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCollections({ hasCollectionsStore: true });
    harness.collectionsStore.failNext("get", undefined);

    await expect(updateCollection("c1", { name: "New" })).rejects.toThrow(
      "Failed to load collection for update",
    );
    harness.cleanup();
  });

  it("rejects when store.put fails", async () => {
    jest.spyOn(Date, "now").mockReturnValue(2);
    const existing: CollectionRecord = {
      id: "c1",
      name: "Old",
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
    harness.collectionsStore.failNext("put", new Error("put-failed"));

    await expect(updateCollection("c1", { name: "New" })).rejects.toThrow("put-failed");
    harness.cleanup();
  });

  it("rejects with a default error when store.put fails without request.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(2);
    const existing: CollectionRecord = {
      id: "c1",
      name: "Old",
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
    harness.collectionsStore.failNext("put", undefined);

    await expect(updateCollection("c1", { name: "New" })).rejects.toThrow(
      "Failed to update collection",
    );
    harness.cleanup();
  });
});
