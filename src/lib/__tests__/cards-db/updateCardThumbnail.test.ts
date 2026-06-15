import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { getCardThumbnail, updateCardThumbnail } from "@/lib/cards-db";

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
    await db.cards.put(createCardRecord({ id: "c1" }));

    const ok = await updateCardThumbnail("c1", new Blob(["x"]));
    expect(ok).toBe(true);
    expect((await getCardThumbnail("c1"))?.type).toBe("image/png");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "c1");
  });
});
