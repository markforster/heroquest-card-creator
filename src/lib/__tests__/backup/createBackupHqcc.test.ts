jest.mock("@/api/client", () => ({
  apiClient: {
    getCard: jest.fn(),
    listAssetsWithBlobs: jest.fn(),
    listCollections: jest.fn(),
    listPairs: jest.fn(),
    listDecks: jest.fn(),
    getBorderSwatches: jest.fn(),
    getDefaultCopyright: jest.fn(),
  },
}));

jest.mock("@/lib/cards-db", () => ({
  listCards: jest.fn(),
}));

jest.mock("@/lib/hero-back-logos-db", () => ({
  listHeroBackLogosWithBlobs: jest.fn(),
}));

const createZipBlobWithProgress = jest.fn();

jest.mock("@/lib/zip-utils", () => ({
  createZipBlobWithProgress: (...args: unknown[]) => createZipBlobWithProgress(...args),
}));

import { apiClient } from "@/api/client";
import { createBackupHqcc } from "@/lib/backup/backup-export";
import { listCards } from "@/lib/cards-db";
import { listHeroBackLogosWithBlobs } from "@/lib/hero-back-logos-db";
import { getHqccDexieDb } from "@/lib/hqcc-dexie";
import {
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

const mockedApiClient = apiClient as unknown as Record<string, jest.Mock>;
const mockedListCards = listCards as jest.MockedFunction<typeof listCards>;
const mockedListHeroBackLogosWithBlobs =
  listHeroBackLogosWithBlobs as jest.MockedFunction<typeof listHeroBackLogosWithBlobs>;

describe("createBackupHqcc", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    mockedListCards.mockReset();
    mockedApiClient.getCard.mockReset();
    mockedApiClient.listAssetsWithBlobs.mockReset();
    mockedApiClient.listCollections.mockReset();
    mockedApiClient.listPairs.mockReset();
    mockedApiClient.listDecks.mockReset();
    mockedApiClient.getBorderSwatches.mockReset();
    mockedApiClient.getDefaultCopyright.mockReset();
    mockedListHeroBackLogosWithBlobs.mockReset();
    createZipBlobWithProgress.mockReset();

    mockedListCards.mockResolvedValue([]);
    mockedApiClient.listAssetsWithBlobs.mockResolvedValue([]);
    mockedApiClient.listCollections.mockResolvedValue([]);
    mockedApiClient.listPairs.mockResolvedValue([]);
    mockedApiClient.listDecks.mockResolvedValue([]);
    mockedApiClient.getBorderSwatches.mockResolvedValue([]);
    mockedApiClient.getDefaultCopyright.mockResolvedValue("");
    mockedListHeroBackLogosWithBlobs.mockResolvedValue([]);
    createZipBlobWithProgress.mockResolvedValue(new Blob(["zip"], { type: "application/zip" }));

    window.localStorage.clear();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {
      // Ignore teardown failures if the DB module was not opened.
    }

    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
  });

  it("includes Hero Back logos in compact backup exports", async () => {
    mockedListHeroBackLogosWithBlobs.mockResolvedValue([
      {
        id: "logo-1",
        name: "Clan Crest",
        mimeType: "image/png",
        width: 200,
        height: 80,
        createdAt: 1,
        updatedAt: 2,
        blob: new Blob(["logo"], { type: "image/png" }),
      },
    ]);

    const result = await createBackupHqcc({ format: "compact-zip-v1" });

    expect(createZipBlobWithProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining("hero-back-logo-logo-1"),
            data: expect.any(Blob),
          }),
        ]),
      }),
    );
    expect(result.meta.heroBackLogosCount).toBe(1);
  });
});
