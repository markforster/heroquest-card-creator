import { deleteCard, getCard } from "@/lib/cards-db";
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

describe("deleteCard", () => {
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

  it("deletes a card", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "c1" }));
    await seedNormalizedThumbnail({
      cardId: "c1",
      thumbnailBlob: new Blob(["x"], { type: "image/png" }),
    });

    await deleteCard("c1");
    await expect(getCard("c1")).resolves.toBeNull();
    await expect(db.cardsBase.get("c1")).resolves.toBeUndefined();
    await expect(db.cardThumbnails.get("c1")).resolves.toBeUndefined();
    await expect(db.cardSlotLinks.where("cardId").equals("c1").count()).resolves.toBe(0);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "c1");
  });
});
