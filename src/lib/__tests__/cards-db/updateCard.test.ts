import { updateCard } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

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

describe("updateCard", () => {
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

  it("returns null when the card does not exist", async () => {
    await expect(updateCard("missing", { title: "New" })).resolves.toBeNull();
  });

  it("updates an existing card and bumps updatedAt", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const db = await openHqccDexieDb();
    await db.cards.put(createCardRecord({ id: "c1", createdAt: 100, updatedAt: 100, name: "Old Name", nameLower: "old name" }));

    const next = await updateCard("c1", { title: "New title" });

    expect(next).toEqual({
      ...createCardRecord({ id: "c1", createdAt: 100, updatedAt: 100, name: "Old Name", nameLower: "old name" }),
      title: "New title",
      updatedAt: 200,
    });
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "c1");
  });

  it("recomputes nameLower when patch.name is provided", async () => {
    const db = await openHqccDexieDb();
    await db.cards.put(createCardRecord({ id: "c1", name: "Old Name", nameLower: "old name" }));

    const next = await updateCard("c1", { name: "NEW NAME" });
    expect(next?.nameLower).toBe("new name");
  });
});
