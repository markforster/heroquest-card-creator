const getCard = jest.fn();
const createPair = jest.fn();
const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/cards-db", () => ({
  getCard: (...args: unknown[]) => getCard(...args),
}));

jest.mock("@/lib/pairs-service", () => ({
  createPair: (...args: unknown[]) => createPair(...args),
}));

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import {
  addFrontsToSet,
  createGroup,
  createSet,
  reorderEntries,
  reorderGroups,
  reorderSets,
} from "@/lib/decks-service";

import {
  TEST_NOW,
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  createPairRecord,
  createSavedCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("decks-service deck updatedAt touch propagation", () => {
  let nowValue = 1_000;

  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
    getCard.mockReset();
    createPair.mockReset();
    nowValue = 1_000;
    jest.spyOn(Date, "now").mockImplementation(() => nowValue);
    getCard.mockResolvedValue(createSavedCardRecord({ face: "back", templateId: "labelled-back" }));
    createPair.mockResolvedValue(createPairRecord());
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
    jest.resetModules();
  });

  it("touches deck updatedAt for group mutations", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(createDeckRecord({ id: "deck-1", updatedAt: TEST_NOW }));
    await db.deckGroups.bulkPut([
      createDeckGroupRecord({ id: "group-1", deckId: "deck-1", sortIndex: 0 }),
      createDeckGroupRecord({ id: "group-2", deckId: "deck-1", sortIndex: 1 }),
    ]);

    await createGroup("deck-1", {});
    const touchedAfterCreate = (await db.decks.get("deck-1"))?.updatedAt ?? 0;

    nowValue = 2_000;
    await reorderGroups("deck-1", ["group-2", "group-1"]);
    const touchedAfterReorder = (await db.decks.get("deck-1"))?.updatedAt ?? 0;

    expect(touchedAfterCreate).toBe(1_000);
    expect(touchedAfterReorder).toBe(2_000);
  });

  it("touches deck updatedAt for set mutations", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(createDeckRecord({ id: "deck-1", updatedAt: TEST_NOW }));
    await db.deckGroups.put(createDeckGroupRecord({ id: "group-1", deckId: "deck-1" }));
    await db.deckSets.put(createDeckSetRecord({ id: "set-1", deckId: "deck-1", groupId: "group-1", updatedAt: TEST_NOW }));

    await createSet("deck-1", "group-1", { backFaceId: "back-2", description: null });
    const touchedAfterCreate = (await db.decks.get("deck-1"))?.updatedAt ?? 0;

    nowValue = 3_000;
    await reorderSets("deck-1", "group-1", ["set-1"]);
    const touchedAfterReorder = (await db.decks.get("deck-1"))?.updatedAt ?? 0;

    expect(touchedAfterCreate).toBe(1_000);
    expect(touchedAfterReorder).toBe(3_000);
  });

  it("touches deck updatedAt for entry mutations", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(createDeckRecord({ id: "deck-1", updatedAt: TEST_NOW }));
    await db.deckGroups.put(createDeckGroupRecord({ id: "group-1", deckId: "deck-1" }));
    await db.deckSets.put(createDeckSetRecord({ id: "set-1", deckId: "deck-1", groupId: "group-1" }));
    await db.deckEntries.put(createDeckEntryRecord({ id: "entry-1", deckId: "deck-1", setId: "set-1", pairId: "pair-1" }));
    createPair.mockResolvedValueOnce(createPairRecord({ id: "pair-2", frontFaceId: "front-2" }));

    await addFrontsToSet("set-1", ["front-1"]);
    const touchedAfterAdd = (await db.decks.get("deck-1"))?.updatedAt ?? 0;

    nowValue = 4_000;
    await reorderEntries("set-1", ["entry-1"]);
    const touchedAfterReorder = (await db.decks.get("deck-1"))?.updatedAt ?? 0;

    expect(touchedAfterAdd).toBe(1_000);
    expect(touchedAfterReorder).toBe(4_000);
  });
});
