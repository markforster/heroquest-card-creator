import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { touchCardLastViewed } from "@/lib/cards-db";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";
import { seedNormalizedCard } from "@/lib/test-support/normalized-card-test-helpers";

describe("touchCardLastViewed", () => {
  beforeEach(() => {
    installFakeIndexedDb();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("updates lastViewedAt when the card exists", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "c1", createdAt: 1, updatedAt: 1 }));

    const card = await touchCardLastViewed("c1", 999);
    expect(card?.lastViewedAt).toBe(999);
    await expect(db.cardsBase.get("c1")).resolves.toEqual(
      expect.objectContaining({ lastViewedAt: 999 }),
    );
  });
});
