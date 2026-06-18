import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { updateCards } from "@/lib/cards-db";

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

describe("updateCards", () => {
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

  it("replaces normalized rows for each updated card and skips missing ids", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "c1", title: "Old One" }));
    await seedNormalizedCard(createCardRecord({ id: "c2", title: "Old Two" }));

    await updateCards(["c1", "c2", "missing"], { title: "New Title" });

    await expect(db.cardTitleComponents.get("c1:hq.2021.title.main")).resolves.toEqual(
      expect.objectContaining({ title: "New Title" }),
    );
    await expect(db.cardTitleComponents.get("c2:hq.2021.title.main")).resolves.toEqual(
      expect.objectContaining({ title: "New Title" }),
    );
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "c1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "c2");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "missing");
  });
});
