const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/db/maintenance/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import {
  cascadeDeleteDeckDataForBackFaceIds,
  createDeck,
  deleteGroup,
  duplicateDeck,
  rebuildSetBack,
  removeEntries,
  updateDeck,
  updateGroup,
  updateSet,
} from "@/lib/data/decks-mutations";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import {
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("deck mutation operations", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
  });

  afterEach(async () => {
    getHqccDexieDb().close();
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
  });

  it("creates and updates a deck with its required initial group", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const created = await createDeck({ id: "deck-new", title: "New deck" });
    const db = await openHqccDexieDb();

    expect(created).toEqual(expect.objectContaining({ id: "deck-new", keySetId: null }));
    await expect(db.deckGroups.where("deckId").equals("deck-new").count()).resolves.toBe(1);
    await expect(updateDeck("deck-new", { description: "Updated" })).resolves.toEqual(
      expect.objectContaining({ description: "Updated", updatedAt: 200 }),
    );
    await expect(updateDeck("missing", { title: "No" })).resolves.toBeNull();
  });

  it("duplicates a complete deck and updates or removes child structures", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(createDeckRecord());
    await db.deckGroups.bulkPut([
      createDeckGroupRecord(),
      createDeckGroupRecord({ id: "group-2", title: "Second", sortIndex: 1 }),
    ]);
    await db.deckSets.put(createDeckSetRecord());
    await db.deckEntries.put(createDeckEntryRecord());

    const copy = await duplicateDeck("deck-1");
    expect(copy).toEqual(expect.objectContaining({ title: "Deck (Copy)" }));
    await expect(db.deckGroups.where("deckId").equals(copy!.id).count()).resolves.toBe(2);
    await expect(db.deckSets.where("deckId").equals(copy!.id).count()).resolves.toBe(1);
    await expect(db.deckEntries.where("deckId").equals(copy!.id).count()).resolves.toBe(1);
    await expect(duplicateDeck("missing")).resolves.toBeNull();

    await expect(updateGroup("group-1", { title: "Renamed" })).resolves.toEqual(
      expect.objectContaining({ title: "Renamed" }),
    );
    await expect(updateSet("set-1", { title: "Updated set" })).resolves.toEqual(
      expect.objectContaining({ title: "Updated set" }),
    );
    await removeEntries("set-1", ["entry-1"]);
    await expect(db.deckEntries.get("entry-1")).resolves.toBeUndefined();
    await deleteGroup("group-1");
    await expect(db.deckGroups.get("group-1")).resolves.toBeUndefined();
  });

  it("cascades a back-face deletion through empty deck structures", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(createDeckRecord());
    await db.deckGroups.put(createDeckGroupRecord());
    await db.deckSets.put(createDeckSetRecord());
    await db.deckEntries.put(createDeckEntryRecord());

    const result = await cascadeDeleteDeckDataForBackFaceIds(["back-1"]);
    expect(result.deletedEntries).toBeGreaterThanOrEqual(1);
    expect(result.deletedSets).toBeGreaterThanOrEqual(1);
    expect(result.deletedGroups).toBeGreaterThanOrEqual(1);
    expect(result.deletedDecks).toBeGreaterThanOrEqual(1);
    await expect(db.deckSets.get("set-1")).resolves.toBeUndefined();
    await expect(db.deckEntries.get("entry-1")).resolves.toBeUndefined();
    await expect(cascadeDeleteDeckDataForBackFaceIds([])).resolves.toEqual({
      deletedEntries: 0,
      deletedSets: 0,
      deletedGroups: 0,
      deletedDecks: 0,
    });
  });

  it("handles missing and conflicting set-back rebuilds", async () => {
    await expect(rebuildSetBack("missing", "back-2", [])).resolves.toBeUndefined();
    const db = await openHqccDexieDb();
    await db.deckSets.bulkPut([
      createDeckSetRecord(),
      createDeckSetRecord({ id: "set-2", backFaceId: "back-2" }),
    ]);

    await expect(rebuildSetBack("set-1", "back-2", [])).rejects.toEqual(
      expect.objectContaining({ code: "DECK_SET_BACK_ALREADY_USED", existingSetId: "set-2" }),
    );
  });
});
