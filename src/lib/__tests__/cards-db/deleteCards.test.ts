import { deleteCards, getCard } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import {
  seedNormalizedCard,
  seedNormalizedThumbnail,
} from "@/lib/test-support/normalized-card-test-helpers";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("deleteCards", () => {
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

  it("returns early when ids is empty", async () => {
    await expect(deleteCards([])).resolves.toBeUndefined();
  });

  it("deletes multiple cards", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "a" }));
    await seedNormalizedCard(createCardRecord({ id: "b" }));
    await seedNormalizedThumbnail({ cardId: "a", thumbnailBlob: new Blob(["a"], { type: "image/png" }) });
    await seedNormalizedThumbnail({ cardId: "b", thumbnailBlob: new Blob(["b"], { type: "image/png" }) });

    await deleteCards(["a", "b"]);
    await expect(getCard("a")).resolves.toBeNull();
    await expect(getCard("b")).resolves.toBeNull();
    await expect(db.cardsBase.bulkGet(["a", "b"])).resolves.toEqual([undefined, undefined]);
    await expect(db.cardThumbnails.bulkGet(["a", "b"])).resolves.toEqual([undefined, undefined]);
    await expect(db.cardSlotLinks.where("cardId").anyOf(["a", "b"]).count()).resolves.toBe(0);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "a");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "b");
  });
});
