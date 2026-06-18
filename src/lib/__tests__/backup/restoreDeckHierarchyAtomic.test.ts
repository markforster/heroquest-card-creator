import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { restoreDeckHierarchyAtomic } from "@/lib/backup/backup-validation";
import {
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("restoreDeckHierarchyAtomic", () => {
  beforeEach(() => {
    installFakeIndexedDb();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {
      // Ignore teardown failures if the DB module was not opened.
    }

    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("writes decks, groups, sets, and entries in one successful restore", async () => {
    await expect(
      restoreDeckHierarchyAtomic({
        decks: [createDeckRecord({ id: "deck-1" })],
        deckGroups: [createDeckGroupRecord({ id: "group-1", deckId: "deck-1" })],
        deckSets: [
          createDeckSetRecord({
            id: "set-1",
            deckId: "deck-1",
            groupId: "group-1",
            backFaceId: "back-1",
          }),
        ],
        deckEntries: [
          createDeckEntryRecord({
            id: "entry-1",
            deckId: "deck-1",
            setId: "set-1",
            pairId: "pair-1",
          }),
        ],
      }),
    ).resolves.toBeUndefined();

    const db = await openHqccDexieDb();
    await expect(db.decks.get("deck-1")).resolves.toEqual(expect.objectContaining({ id: "deck-1" }));
    await expect(db.deckGroups.get("group-1")).resolves.toEqual(
      expect.objectContaining({ id: "group-1", deckId: "deck-1" }),
    );
    await expect(db.deckSets.get("set-1")).resolves.toEqual(
      expect.objectContaining({ id: "set-1", deckId: "deck-1", groupId: "group-1" }),
    );
    await expect(db.deckEntries.get("entry-1")).resolves.toEqual(
      expect.objectContaining({ id: "entry-1", deckId: "deck-1", setId: "set-1" }),
    );
  });

  it("rejects when duplicate ids are provided", async () => {
    await expect(
      restoreDeckHierarchyAtomic({
        decks: [createDeckRecord({ id: "deck-1" }), createDeckRecord({ id: "deck-1" })],
        deckGroups: [],
        deckSets: [],
        deckEntries: [],
      }),
    ).rejects.toThrow("Failed to restore deck hierarchy");

    const db = await openHqccDexieDb();
    await expect(db.decks.toArray()).resolves.toEqual([]);
  });

  it("preserves atomicity when one store write fails", async () => {
    const db = await openHqccDexieDb();
    await db.deckGroups.add(createDeckGroupRecord({ id: "group-existing", deckId: "deck-existing" }));

    await expect(
      restoreDeckHierarchyAtomic({
        decks: [createDeckRecord({ id: "deck-new" })],
        deckGroups: [createDeckGroupRecord({ id: "group-existing", deckId: "deck-new" })],
        deckSets: [
          createDeckSetRecord({
            id: "set-new",
            deckId: "deck-new",
            groupId: "group-existing",
            backFaceId: "back-1",
          }),
        ],
        deckEntries: [
          createDeckEntryRecord({
            id: "entry-new",
            deckId: "deck-new",
            setId: "set-new",
            pairId: "pair-1",
          }),
        ],
      }),
    ).rejects.toThrow("Failed to restore deck hierarchy");

    await expect(db.decks.get("deck-new")).resolves.toBeUndefined();
    await expect(db.deckGroups.get("group-existing")).resolves.toEqual(
      expect.objectContaining({ id: "group-existing", deckId: "deck-existing" }),
    );
    await expect(db.deckSets.get("set-new")).resolves.toBeUndefined();
    await expect(db.deckEntries.get("entry-new")).resolves.toBeUndefined();
  });

  it("accepts empty input arrays", async () => {
    const db = await openHqccDexieDb();
    await db.decks.add(createDeckRecord({ id: "deck-empty-existing" }));
    await db.deckGroups.add(
      createDeckGroupRecord({ id: "group-empty-existing", deckId: "deck-empty-existing" }),
    );
    await db.deckSets.add(
      createDeckSetRecord({
        id: "set-empty-existing",
        deckId: "deck-empty-existing",
        groupId: "group-empty-existing",
        backFaceId: "back-existing",
      }),
    );
    await db.deckEntries.add(
      createDeckEntryRecord({
        id: "entry-empty-existing",
        deckId: "deck-empty-existing",
        setId: "set-empty-existing",
        pairId: "pair-existing",
      }),
    );
    const beforeDecks = await db.decks.toArray();
    const beforeGroups = await db.deckGroups.toArray();
    const beforeSets = await db.deckSets.toArray();
    const beforeEntries = await db.deckEntries.toArray();

    await expect(
      restoreDeckHierarchyAtomic({
        decks: [],
        deckGroups: [],
        deckSets: [],
        deckEntries: [],
      }),
    ).resolves.toBeUndefined();

    await expect(db.decks.toArray()).resolves.toEqual(beforeDecks);
    await expect(db.deckGroups.toArray()).resolves.toEqual(beforeGroups);
    await expect(db.deckSets.toArray()).resolves.toEqual(beforeSets);
    await expect(db.deckEntries.toArray()).resolves.toEqual(beforeEntries);
  });
});
