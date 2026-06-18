import { deleteCardsWithCascade, previewDeleteCardsImpact } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import {
  TEST_NOW,
  createCardRecord,
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";
import { seedNormalizedCard } from "@/lib/test-support/normalized-card-test-helpers";

const deletePairsForFaces = jest.fn();
const previewDeletePairsForFaces = jest.fn();
const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/pairs-service", () => ({
  deletePairsForFaces: (...args: unknown[]) => deletePairsForFaces(...args),
  previewDeletePairsForFaces: (...args: unknown[]) => previewDeletePairsForFaces(...args),
}));

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("deleteCardsWithCascade", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    jest.spyOn(Date, "now").mockReturnValue(TEST_NOW + 50);
    deletePairsForFaces.mockReset();
    previewDeletePairsForFaces.mockReset();
    enqueueDbEstimateChange.mockReset();
    deletePairsForFaces.mockResolvedValue({
      kind: "no-impact" as const,
      report: {
        frontFaceId: "__bulk__",
        backFaceId: "__bulk__",
        mode: "confirmable-cascade" as const,
        cascadePlan: { pairIds: [], entryIds: [], usage: [] },
      },
    });
    previewDeletePairsForFaces.mockResolvedValue({
      frontFaceId: "__bulk__",
      backFaceId: "__bulk__",
      mode: "confirmable-cascade" as const,
      cascadePlan: { pairIds: [], entryIds: [], usage: [] },
    });
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("previews deck and pair usage for card deletion", async () => {
    const db = await openHqccDexieDb();
    await db.deckGroups.put(createDeckGroupRecord({ id: "group-1", deckId: "deck-1" }));
    await db.decks.put(createDeckRecord({ id: "deck-1", title: "Hard Delete" }));
    await db.deckSets.put(createDeckSetRecord({ id: "set-1", deckId: "deck-1", groupId: "group-1", backFaceId: "back-1" }));
    previewDeletePairsForFaces.mockResolvedValueOnce({
      frontFaceId: "__bulk__",
      backFaceId: "__bulk__",
      mode: "confirmable-cascade",
      cascadePlan: { pairIds: [], entryIds: ["entry-1"], usage: [] },
    });

    const impact = await previewDeleteCardsImpact(["back-1"]);
    expect(impact.cascadePlan.deckSetIds).toEqual(["set-1"]);
    expect(impact.cascadePlan.deckEntryIds).toEqual(["entry-1"]);
  });

  it("removes dependent set and entries, removes now-empty group, and keeps deck", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "back-1", face: "back", name: "Back One", nameLower: "back one" }));
    await db.decks.put(createDeckRecord({ id: "deck-1", title: "Hard Delete", updatedAt: TEST_NOW }));
    await db.deckGroups.put(createDeckGroupRecord({ id: "group-1", deckId: "deck-1", title: "New Group" }));
    await db.deckSets.put(createDeckSetRecord({ id: "set-1", deckId: "deck-1", groupId: "group-1", title: "New Set", backFaceId: "back-1" }));
    await db.deckEntries.put(createDeckEntryRecord({ id: "entry-1", deckId: "deck-1", setId: "set-1", pairId: "pair-1" }));

    await deleteCardsWithCascade(["back-1"], { mode: "confirmable-cascade", confirmCascade: true });
    await expect(db.cardsBase.get("back-1")).resolves.toBeUndefined();
    await expect(db.deckSets.get("set-1")).resolves.toBeUndefined();
    await expect(db.deckEntries.get("entry-1")).resolves.toBeUndefined();
    await expect(db.deckGroups.get("group-1")).resolves.toBeUndefined();
    await expect(db.decks.get("deck-1")).resolves.toEqual(
      expect.objectContaining({ updatedAt: TEST_NOW + 50 }),
    );
    expect(deletePairsForFaces).toHaveBeenCalledWith(["back-1"], {
      mode: "confirmable-cascade",
      confirmCascade: true,
    });
  });

  it("throws confirm-required when destructive impact exists and cascade is not confirmed", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "back-1", face: "back" }));
    await db.decks.put(createDeckRecord({ id: "deck-1", title: "Hard Delete" }));
    await db.deckGroups.put(createDeckGroupRecord({ id: "group-1", deckId: "deck-1" }));
    await db.deckSets.put(
      createDeckSetRecord({
        id: "set-1",
        deckId: "deck-1",
        groupId: "group-1",
        backFaceId: "back-1",
      }),
    );

    await expect(
      deleteCardsWithCascade(["back-1"], {
        mode: "confirmable-cascade",
        confirmCascade: false,
      }),
    ).rejects.toMatchObject({ code: "CARD_DELETE_CONFIRM_REQUIRED" });
  });
});
