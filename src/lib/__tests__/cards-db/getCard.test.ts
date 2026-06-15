import { getCard } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

describe("getCard", () => {
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

  it("returns null when the card is missing", async () => {
    await expect(getCard("missing")).resolves.toBeNull();
  });

  it("returns the card when present", async () => {
    const db = await openHqccDexieDb();
    await db.cards.put(createCardRecord({ id: "c1" }));

    await expect(getCard("c1")).resolves.toEqual(createCardRecord({ id: "c1" }));
  });

  it("normalizes a thumbnail blob with no type and schedules repair", async () => {
    const db = await openHqccDexieDb();
    await db.cards.put(createCardRecord({ id: "c1", thumbnailBlob: new Blob(["x"]) }));

    const card = await getCard("c1");
    expect(card?.thumbnailBlob?.type).toBe("image/png");
  });
});
