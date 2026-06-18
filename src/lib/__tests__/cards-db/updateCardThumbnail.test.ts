import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { getCardThumbnail, updateCardThumbnail } from "@/lib/cards-db";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";
import { seedNormalizedCard } from "@/lib/test-support/normalized-card-test-helpers";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("updateCardThumbnail", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("returns false when the card is missing", async () => {
    await expect(updateCardThumbnail("missing", new Blob(["x"]))).resolves.toBe(false);
  });

  it("updates and normalizes the thumbnail blob", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "c1", createdAt: 1, updatedAt: 1 }));

    const ok = await updateCardThumbnail("c1", new Blob(["x"]));
    expect(ok).toBe(true);
    expect((await getCardThumbnail("c1"))?.type).toBe("image/png");
    const thumbnailRecord = await db.cardThumbnails.get("c1");
    expect(thumbnailRecord?.id).toBe("c1");
    expect(thumbnailRecord?.cardId).toBe("c1");
    expect(thumbnailRecord).toBeDefined();
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "c1");
  });

  it("deletes the normalized thumbnail row when passed null", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "c1", createdAt: 1, updatedAt: 1 }));
    await db.cardThumbnails.put({
      id: "c1",
      cardId: "c1",
      thumbnailBlob: new Blob(["x"], { type: "image/png" }),
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });

    await expect(updateCardThumbnail("c1", null)).resolves.toBe(true);
    await expect(db.cardThumbnails.get("c1")).resolves.toBeUndefined();
    await expect(getCardThumbnail("c1")).resolves.toBeNull();
  });
});
