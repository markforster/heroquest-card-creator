import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { previewDeletePair } from "@/lib/pairs-service";

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

describe("previewDeletePair", () => {
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

  it("returns an empty report when no pair matches", async () => {
    await expect(previewDeletePair("front-1", "back-1")).resolves.toEqual({
      frontFaceId: "front-1",
      backFaceId: "back-1",
      mode: "confirmable-cascade",
      cascadePlan: {
        pairIds: [],
        entryIds: [],
        usage: [],
      },
    });
  });

  it("returns pair, entry, and deck usage details for a dependent pair", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.put(createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }));
    await db.decks.put(createDeckRecord());
    await db.deckGroups.put(createDeckGroupRecord());
    await db.deckSets.put(createDeckSetRecord());
    await db.deckEntries.put(createDeckEntryRecord({ id: "entry-1", pairId: "pair-1" }));

    await expect(previewDeletePair("front-1", "back-1")).resolves.toEqual({
      frontFaceId: "front-1",
      backFaceId: "back-1",
      mode: "confirmable-cascade",
      cascadePlan: {
        pairIds: ["pair-1"],
        entryIds: ["entry-1"],
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
