import {
  getDeck,
  getDeckUsageForBackFaceIds,
  getDeckUsageForPair,
  getGroup,
  listDecks,
  validatePairEntry,
} from "@/lib/data/decks-queries";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import {
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("deck queries", () => {
  beforeEach(() => {
    installFakeIndexedDb();
  });

  afterEach(async () => {
    getHqccDexieDb().close();
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
  });

  it("lists and loads decks and groups", async () => {
    const db = await openHqccDexieDb();
    await db.decks.bulkPut([
      createDeckRecord({ id: "deck-1", title: "Alpha" }),
      createDeckRecord({ id: "deck-2", title: "Beta", keySetId: undefined as never }),
    ]);
    await db.deckGroups.put(createDeckGroupRecord());

    await expect(listDecks({ search: "ALP" })).resolves.toEqual([
      expect.objectContaining({ id: "deck-1", keySetId: null }),
    ]);
    await expect(getDeck("deck-2")).resolves.toEqual(
      expect.objectContaining({ id: "deck-2", keySetId: null }),
    );
    await expect(getDeck("missing")).resolves.toBeNull();
    await expect(getGroup("group-1")).resolves.toEqual(expect.objectContaining({ id: "group-1" }));
    await expect(getGroup("missing")).resolves.toBeNull();
  });

  it("resolves pair and back-face usage with deck location labels", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(createDeckRecord());
    await db.deckGroups.put(createDeckGroupRecord());
    await db.deckSets.put(createDeckSetRecord());
    await db.deckEntries.put(createDeckEntryRecord());

    await expect(getDeckUsageForPair("pair-1")).resolves.toEqual([
      {
        deckId: "deck-1",
        deckTitle: "Deck",
        groupId: "group-1",
        groupTitle: "Group",
        setId: "set-1",
        setTitle: "Set",
      },
    ]);
    await expect(getDeckUsageForBackFaceIds(["back-1"])).resolves.toEqual([
      expect.objectContaining({ setId: "set-1", backFaceId: "back-1" }),
    ]);
    await expect(getDeckUsageForBackFaceIds([])).resolves.toEqual([]);
  });

  it("validates complete matching pairs", async () => {
    const db = await openHqccDexieDb();
    await db.deckSets.put(createDeckSetRecord());
    await db.pairs.put(createPairRecord());

    await expect(validatePairEntry("set-1", "pair-1")).resolves.toBeUndefined();
    await db.pairs.put(createPairRecord({ id: "wrong", backFaceId: "back-2" }));
    await expect(validatePairEntry("set-1", "wrong")).rejects.toThrow(
      "Pair back does not match set back",
    );
    await expect(validatePairEntry("missing", "pair-1")).resolves.toBeUndefined();
  });
});
