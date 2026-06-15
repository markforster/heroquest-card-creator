import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { touchCardLastViewed } from "@/lib/cards-db";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

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
    await db.cards.put(createCardRecord({ id: "c1" }));

    const card = await touchCardLastViewed("c1", 999);
    expect(card?.lastViewedAt).toBe(999);
    await expect(db.cards.get("c1")).resolves.toEqual(
      expect.objectContaining({ lastViewedAt: 999 }),
    );
  });
});
