jest.mock("@/api/client", () => ({
  apiClient: {
    listCards: jest.fn(),
    listAssets: jest.fn(),
    listCollections: jest.fn(),
    listPairs: jest.fn(),
    listDecks: jest.fn(),
    deleteCards: jest.fn(),
    deleteAssets: jest.fn(),
    deleteCollection: jest.fn(),
    deleteDeck: jest.fn(),
    deletePair: jest.fn(),
    createCard: jest.fn(),
    createCollection: jest.fn(),
    setBorderSwatches: jest.fn(),
    setDefaultCopyright: jest.fn(),
    createPair: jest.fn(),
  },
}));

import { apiClient } from "@/api/client";
import { importBackupJson } from "@/lib/backup/backup-import";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import {
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

const mockedApiClient = apiClient as unknown as Record<string, jest.Mock>;

describe("importBackupJson", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    window.localStorage.clear();

    mockedApiClient.listCards.mockResolvedValue([]);
    mockedApiClient.listAssets.mockResolvedValue([]);
    mockedApiClient.listCollections.mockResolvedValue([]);
    mockedApiClient.listPairs.mockResolvedValue([]);
    mockedApiClient.listDecks.mockResolvedValue([]);
    mockedApiClient.deleteCards.mockResolvedValue(undefined as never);
    mockedApiClient.deleteAssets.mockResolvedValue(undefined as never);
    mockedApiClient.deleteCollection.mockResolvedValue(undefined as never);
    mockedApiClient.deleteDeck.mockResolvedValue(undefined as never);
    mockedApiClient.deletePair.mockResolvedValue(undefined as never);
    mockedApiClient.createCard.mockResolvedValue(undefined as never);
    mockedApiClient.createCollection.mockResolvedValue(undefined as never);
    mockedApiClient.setBorderSwatches.mockResolvedValue(undefined as never);
    mockedApiClient.setDefaultCopyright.mockResolvedValue(undefined as never);
    mockedApiClient.createPair.mockResolvedValue(undefined as never);
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
    jest.clearAllMocks();
  });

  it("restores validated deck hierarchy records through the JSON import path", async () => {
    const exportData = {
      schemaVersion: 2 as const,
      createdAt: "2026-06-15T12:00:00.000Z",
      cards: [createSavedCardRecord({ id: "back-1" })],
      assets: [],
      pairs: [createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" })],
      collections: [],
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
      settings: { borderSwatches: [], defaultCopyright: "" },
      exportProfiles: {
        schemaVersion: 1 as const,
        defaultProfileId: "profile-1",
        selectedProfileId: "profile-1",
        profiles: [
          {
            id: "profile-1",
            name: "Default",
            updatedAt: 100,
            settings: {
              bleed: { enabled: true, bleedPx: 18, askBeforeExport: false },
              cropMarks: { enabled: true, color: "#00FFFF", style: "lines" as const },
              cutMarks: { enabled: false, color: "#00FFFF", style: "dashed" as const },
              roundedCorners: true,
              pdf: {
                paper: "Letter" as const,
                orientation: "portrait" as const,
                marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
                gapMm: { x: 0, y: 0 },
                cardMm: { width: 63.5, height: 88.9 },
                mode: "frontsOnly" as const,
                bleedMode: "bakedInImage" as const,
                bleedMm: 3,
                duplexPreset: "normal" as const,
              },
            },
          },
        ],
      },
      localStorage: {},
    };

    const file = {
      text: jest.fn().mockResolvedValue(JSON.stringify(exportData)),
    } as unknown as File;

    await expect(importBackupJson(file)).resolves.toEqual(
      expect.objectContaining({
        cardsCount: 1,
        decksCount: 1,
        deckGroupsCount: 1,
        deckSetsCount: 1,
        deckEntriesCount: 1,
      }),
    );

    const db = await openHqccDexieDb();
    await expect(db.decks.get("deck-1")).resolves.toEqual(expect.objectContaining({ id: "deck-1" }));
    await expect(db.deckGroups.get("group-1")).resolves.toEqual(expect.objectContaining({ id: "group-1" }));
    await expect(db.deckSets.get("set-1")).resolves.toEqual(expect.objectContaining({ id: "set-1" }));
    await expect(db.deckEntries.get("entry-1")).resolves.toEqual(
      expect.objectContaining({ id: "entry-1" }),
    );
    await expect(db.settings.get("exportProfiles")).resolves.toEqual(
      expect.objectContaining({
        id: "exportProfiles",
      }),
    );
  });

  it("rejects invalid deck references before writing hierarchy records", async () => {
    const exportData = {
      schemaVersion: 2 as const,
      createdAt: "2026-06-15T12:00:00.000Z",
      cards: [],
      assets: [],
      pairs: [createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" })],
      collections: [],
      decks: [createDeckRecord({ id: "deck-1" })],
      deckGroups: [createDeckGroupRecord({ id: "group-1", deckId: "deck-1" })],
      deckSets: [
        createDeckSetRecord({
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          backFaceId: "missing-back",
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
      settings: { borderSwatches: [], defaultCopyright: "" },
      localStorage: {},
    };

    const file = {
      text: jest.fn().mockResolvedValue(JSON.stringify(exportData)),
    } as unknown as File;

    await expect(importBackupJson(file)).rejects.toThrow(
      "Invalid backup file: unresolved deck references",
    );

    const db = await openHqccDexieDb();
    await expect(db.decks.toArray()).resolves.toEqual([]);
    await expect(db.deckGroups.toArray()).resolves.toEqual([]);
    await expect(db.deckSets.toArray()).resolves.toEqual([]);
    await expect(db.deckEntries.toArray()).resolves.toEqual([]);
  });
});
