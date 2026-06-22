import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { previewDeletePairsForFaces } from "@/lib/pairs-service";

import {
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/pairs-service-test-helpers";

jest.mock("@/lib/cards-db", () => ({
  getCard: jest.fn(async () => null),
}));

describe("previewDeletePairsForFaces", () => {
  beforeEach(() => {
    jest.resetModules();
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
    jest.resetModules();
  });

  it("dedupes overlapping bulk operations by pair and usage row", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-2", backFaceId: "back-1" }),
    ]);
    await db.decks.put(createDeckRecord());
    await db.deckGroups.put(createDeckGroupRecord());
    await db.deckSets.put(createDeckSetRecord());
    await db.deckEntries.bulkPut([
      createDeckEntryRecord({ id: "entry-1", pairId: "pair-1" }),
      createDeckEntryRecord({ id: "entry-2", pairId: "pair-2", sortIndex: 1 }),
    ]);

    await expect(previewDeletePairsForFaces(["back-1", "front-1"])).resolves.toEqual({
      frontFaceId: "__bulk__",
      backFaceId: "__bulk__",
      mode: "confirmable-cascade",
      cascadePlan: {
        pairIds: expect.arrayContaining(["pair-1", "pair-2"]),
        entryIds: expect.arrayContaining(["entry-1", "entry-2"]),
        usage: [
          {
            deckId: "deck-1",
            deckTitle: "Deck",
            groupId: "group-1",
            groupTitle: "Group",
            setId: "set-1",
            setTitle: "Set",
          },
        ],
      },
    });
  });
});
