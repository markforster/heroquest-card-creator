import { listCards } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

describe("listCards", () => {
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

  it("excludes soft-deleted cards by default", async () => {
    const db = await openHqccDexieDb();
    await db.cards.bulkPut([
      createCardRecord({ id: "1", name: "A", nameLower: "a" }),
      createCardRecord({ id: "2", name: "B", nameLower: "b", deletedAt: 123 }),
    ]);

    const result = await listCards();
    expect(result.map((r) => r.id)).toEqual(["1"]);
  });

  it("can include or isolate soft-deleted cards", async () => {
    const db = await openHqccDexieDb();
    await db.cards.bulkPut([
      createCardRecord({ id: "1", name: "A", nameLower: "a" }),
      createCardRecord({ id: "2", name: "B", nameLower: "b", deletedAt: 123 }),
    ]);

    await expect(listCards({ deleted: "include" })).resolves.toHaveLength(2);
    await expect(listCards({ deleted: "only" })).resolves.toEqual([
      expect.objectContaining({ id: "2" }),
    ]);
  });

  it("filters by templateId, status, and search via scan and filter", async () => {
    const db = await openHqccDexieDb();
    await db.cards.bulkPut([
      createCardRecord({ id: "1", templateId: "hero", status: "saved", name: "Hello", nameLower: "hello" }),
      createCardRecord({ id: "2", templateId: "hero", status: "draft", name: "World", nameLower: "world" }),
      createCardRecord({ id: "3", templateId: "monster", status: "saved", name: "Other", nameLower: "other" }),
    ]);

    await expect(listCards({ templateId: "hero", status: "saved" })).resolves.toEqual([
      expect.objectContaining({ id: "1" }),
    ]);
    await expect(listCards({ search: "HELL" })).resolves.toEqual([
      expect.objectContaining({ id: "1" }),
    ]);
  });
});
