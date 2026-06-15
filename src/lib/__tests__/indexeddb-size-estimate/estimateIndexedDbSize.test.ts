import { createSavedCardRecord } from "@/lib/test-support/decks-service-test-helpers";
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
    const card = createSavedCardRecord({ id: "card-1", thumbnailBlob: createTestBlob(["png"]) });
    const asset = {
      id: "asset-1",
      name: "Asset",
      mimeType: "image/png",
      width: 10,
      height: 20,
      blob: createTestBlob(["abc"]),
      createdAt: 1,
    };

    await db.cards.put(card);
    await db.assets.put(asset);
    await db.meta.put({
      id: "customMeta",
      value: true,
      updatedAt: 1,
    });

    const estimate = await estimateIndexedDbSize({ includeRecordSizes: true });
    const expectedCardBytes = estimateRecordBytes(card).bytes;
    const expectedAssetBytes = estimateRecordBytes(asset).bytes;
    const expectedMetaBytes = estimateRecordBytes({
      id: "customMeta",
      value: true,
      updatedAt: 1,
    }).bytes;

    expect(estimate.byStore.cards).toEqual({ bytes: expectedCardBytes, records: 1 });
    expect(estimate.byStore.assets).toEqual({ bytes: expectedAssetBytes, records: 1 });
    expect(estimate.byStore.meta).toEqual({ bytes: expectedMetaBytes, records: 1 });
    expect(estimate.recordSizes).toEqual(
      expect.objectContaining({
        cards: { "card-1": expectedCardBytes },
        assets: { "asset-1": expectedAssetBytes },
        meta: { customMeta: expectedMetaBytes },
      }),
    );
    expect(estimate.recordsScanned).toBeGreaterThanOrEqual(3);
    expect(estimate.totalBytes).toBeGreaterThanOrEqual(
      expectedCardBytes + expectedAssetBytes + expectedMetaBytes,
    );
  });
});
