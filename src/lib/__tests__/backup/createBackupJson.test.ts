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

import { apiClient } from "@/api/client";
import { createBackupJson } from "@/lib/backup/backup-export";
import { listCards } from "@/lib/cards-db";
import { createCardRecord } from "@/lib/test-support/cards-db-test-helpers";

const mockedApiClient = apiClient as unknown as Record<string, jest.Mock>;
const mockedListCards = listCards as jest.MockedFunction<typeof listCards>;

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsText(blob);
  });
}

describe("createBackupJson", () => {
  beforeEach(() => {
    mockedListCards.mockReset();
    mockedApiClient.getCard.mockReset();
    mockedApiClient.listAssetsWithBlobs.mockReset();
    mockedApiClient.listCollections.mockReset();
    mockedApiClient.listPairs.mockReset();
    mockedApiClient.listDecks.mockReset();
    mockedApiClient.getBorderSwatches.mockReset();
    mockedApiClient.getDefaultCopyright.mockReset();

    mockedApiClient.listAssetsWithBlobs.mockResolvedValue([]);
    mockedApiClient.listCollections.mockResolvedValue([]);
    mockedApiClient.listPairs.mockResolvedValue([]);
    mockedApiClient.listDecks.mockResolvedValue([]);
    mockedApiClient.getBorderSwatches.mockResolvedValue([]);
    mockedApiClient.getDefaultCopyright.mockResolvedValue("");

    window.localStorage.clear();
  });

  it("hydrates full card records before serializing the backup", async () => {
    const summaryCard = createCardRecord({
      id: "hero-1",
      templateId: "hero",
      name: "Sir Ragnar",
      nameLower: "sir ragnar",
      thumbnailBlob: new Blob(["thumb"], { type: "image/png" }),
    });
    const fullCard = createCardRecord({
      id: "hero-1",
      templateId: "hero",
      name: "Sir Ragnar",
      nameLower: "sir ragnar",
      title: "Champion of the Emperor",
      description: "A tested veteran of many campaigns.",
      imageAssetId: "asset-hero-art",
      imageAssetName: "Hero Art",
      heroAttackDice: [4, 0, 0],
      heroDefendDice: [3, 0, 0],
      heroBodyPoints: [8, 0, 0],
      heroMindPoints: [3, 0, 0],
    });

    mockedListCards.mockResolvedValue([summaryCard]);
    mockedApiClient.getCard.mockResolvedValue(fullCard);

    const result = await createBackupJson();
    const text = await readBlobAsText(result.blob);
    const parsed = JSON.parse(text) as {
      cards: Array<Record<string, unknown>>;
    };

    expect(mockedApiClient.getCard).toHaveBeenCalledWith({ params: { id: "hero-1" } });
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0]).toEqual(
      expect.objectContaining({
        id: "hero-1",
        title: "Champion of the Emperor",
        description: "A tested veteran of many campaigns.",
        imageAssetId: "asset-hero-art",
        heroAttackDice: [4, 0, 0],
        heroDefendDice: [3, 0, 0],
        heroBodyPoints: [8, 0, 0],
        heroMindPoints: [3, 0, 0],
        thumbnailDataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      }),
    );
  });

  it("fails export when a card cannot be fully hydrated", async () => {
    mockedListCards.mockResolvedValue([
      createCardRecord({
        id: "broken-1",
        templateId: "monster",
        name: "Broken Goblin",
        nameLower: "broken goblin",
      }),
    ]);
    mockedApiClient.getCard.mockResolvedValue(null);

    await expect(createBackupJson()).rejects.toThrow(
      "Backup export failed because 1 card(s) could not be fully loaded: broken-1",
    );
  });
});
