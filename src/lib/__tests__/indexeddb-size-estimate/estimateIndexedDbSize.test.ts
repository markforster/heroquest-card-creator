import { systemFamilies } from "@/data/card-systems/types";
import {
  createTestBlob,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/__tests__/assets-db/test-helpers";

describe("estimateIndexedDbSize", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
  });

  afterEach(async () => {
    const { getHqccDexieDb } = await import("@/lib/hqcc-dexie");
    getHqccDexieDb().close();
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("scans Dexie tables and returns totals, per-store counts, and record sizes", async () => {
    const { openHqccDexieDb } = await import("@/lib/hqcc-dexie");
    const { estimateIndexedDbSize, estimateRecordBytes } = await import(
      "@/lib/indexeddb-size-estimate"
    );

    const db = await openHqccDexieDb();
    const baseRecord = {
      id: "card-1",
      templateId: "hero" as const,
      systemFamily: systemFamilies.hq_2021,
      status: "saved" as const,
      name: "Card One",
      nameLower: "card one",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1 as const,
    };
    const thumbnailRecord = {
      id: "card-1",
      cardId: "card-1",
      thumbnailBlob: createTestBlob(["png"]),
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1 as const,
    };
    const asset = {
      id: "asset-1",
      name: "Asset",
      mimeType: "image/png",
      width: 10,
      height: 20,
      blob: createTestBlob(["abc"]),
      createdAt: 1,
    };

    await db.cardsBase.put(baseRecord);
    await db.cardThumbnails.put(thumbnailRecord);
    await db.assets.put(asset);
    await db.meta.put({
      id: "customMeta",
      value: true,
      updatedAt: 1,
    });

    const estimate = await estimateIndexedDbSize({ includeRecordSizes: true });
    const expectedBaseBytes = estimateRecordBytes(baseRecord).bytes;
    const expectedThumbnailBytes = estimateRecordBytes(thumbnailRecord).bytes;
    const expectedAssetBytes = estimateRecordBytes(asset).bytes;
    const expectedMetaBytes = estimateRecordBytes({
      id: "customMeta",
      value: true,
      updatedAt: 1,
    }).bytes;

    expect(estimate.byStore.cardsBase).toEqual({ bytes: expectedBaseBytes, records: 1 });
    expect(estimate.byStore.cardThumbnails).toEqual({ bytes: expectedThumbnailBytes, records: 1 });
    expect(estimate.byStore.assets).toEqual({ bytes: expectedAssetBytes, records: 1 });
    expect(estimate.byStore.meta).toEqual({ bytes: expectedMetaBytes, records: 1 });
    expect(estimate.recordSizes).toEqual(
      expect.objectContaining({
        cardsBase: { "card-1": expectedBaseBytes },
        cardThumbnails: { "card-1": expectedThumbnailBytes },
        assets: { "asset-1": expectedAssetBytes },
        meta: { customMeta: expectedMetaBytes },
      }),
    );
    expect(estimate.recordsScanned).toBeGreaterThanOrEqual(4);
    expect(estimate.totalBytes).toBeGreaterThanOrEqual(
      expectedBaseBytes + expectedThumbnailBytes + expectedAssetBytes + expectedMetaBytes,
    );
  });
});
