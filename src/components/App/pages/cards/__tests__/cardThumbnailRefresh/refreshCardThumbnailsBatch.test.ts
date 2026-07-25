import type { CardRecord } from "@/api/cards";
import { refreshCardThumbnailsBatch } from "@/components/App/pages/cards/cardThumbnailRefresh";

describe("refreshCardThumbnailsBatch", () => {
  function buildCard(id: string, overrides?: Partial<CardRecord>): CardRecord {
    return {
      id,
      templateId: "hero-back",
      status: "saved",
      name: `Card ${id}`,
      nameLower: `card ${id}`,
      createdAt: 1,
      updatedAt: 2,
      schemaVersion: 2,
      thumbnailBlob: null,
      ...overrides,
    };
  }

  it("refreshes multiple affected card thumbnails and dispatches one shared update", async () => {
    const getCard = jest
      .fn<Promise<CardRecord | null>, [string]>()
      .mockImplementation(async (cardId) => buildCard(cardId));
    const renderThumbnail = jest
      .fn<Promise<Blob | null>, [CardRecord]>()
      .mockImplementation(async (card) => new Blob([card.id], { type: "image/jpeg" }));
    const updateCardThumbnail = jest.fn<Promise<boolean>, [string, Blob]>().mockResolvedValue(true);
    const readBackThumbnail = jest
      .fn<Promise<Blob | null>, [string]>()
      .mockImplementation(async (cardId) => new Blob([`saved-${cardId}`], { type: "image/jpeg" }));
    const invalidateCardThumbnail = jest.fn();
    const dispatchCardsUpdated = jest.fn();
    const logger = { debug: jest.fn(), warn: jest.fn() };

    await refreshCardThumbnailsBatch({
      cardIds: ["card-1", "card-2", "card-1"],
      getCard,
      renderThumbnail,
      updateCardThumbnail,
      readBackThumbnail,
      invalidateCardThumbnail,
      dispatchCardsUpdated,
      logger,
    });

    expect(getCard).toHaveBeenCalledTimes(2);
    expect(renderThumbnail).toHaveBeenCalledTimes(2);
    expect(updateCardThumbnail).toHaveBeenCalledTimes(2);
    expect(readBackThumbnail).toHaveBeenCalledTimes(2);
    expect(invalidateCardThumbnail).toHaveBeenCalledTimes(2);
    expect(invalidateCardThumbnail).toHaveBeenNthCalledWith(1, "card-1");
    expect(invalidateCardThumbnail).toHaveBeenNthCalledWith(2, "card-2");
    expect(dispatchCardsUpdated).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it("continues after a render failure and logs the failed card stage", async () => {
    const getCard = jest
      .fn<Promise<CardRecord | null>, [string]>()
      .mockImplementation(async (cardId) => buildCard(cardId));
    const renderThumbnail = jest
      .fn<Promise<Blob | null>, [CardRecord]>()
      .mockImplementation(async (card) => {
        if (card.id === "card-2") {
          throw new Error("render failed");
        }
        return new Blob([card.id], { type: "image/jpeg" });
      });
    const updateCardThumbnail = jest.fn<Promise<boolean>, [string, Blob]>().mockResolvedValue(true);
    const readBackThumbnail = jest
      .fn<Promise<Blob | null>, [string]>()
      .mockImplementation(async (cardId) => new Blob([`saved-${cardId}`], { type: "image/jpeg" }));
    const invalidateCardThumbnail = jest.fn();
    const dispatchCardsUpdated = jest.fn();
    const logger = { debug: jest.fn(), warn: jest.fn() };

    await refreshCardThumbnailsBatch({
      cardIds: ["card-1", "card-2", "card-3"],
      getCard,
      renderThumbnail,
      updateCardThumbnail,
      readBackThumbnail,
      invalidateCardThumbnail,
      dispatchCardsUpdated,
      logger,
    });

    expect(updateCardThumbnail).toHaveBeenCalledTimes(2);
    expect(updateCardThumbnail).toHaveBeenNthCalledWith(
      1,
      "card-1",
      expect.any(Blob),
    );
    expect(updateCardThumbnail).toHaveBeenNthCalledWith(
      2,
      "card-3",
      expect.any(Blob),
    );
    expect(dispatchCardsUpdated).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "[thumbnail-refresh] Failed to render thumbnail",
      expect.objectContaining({ cardId: "card-2", stage: "render" }),
    );
  });

  it("does not mark a card refreshed when thumbnail readback returns no blob", async () => {
    const getCard = jest
      .fn<Promise<CardRecord | null>, [string]>()
      .mockImplementation(async (cardId) => buildCard(cardId));
    const renderThumbnail = jest
      .fn<Promise<Blob | null>, [CardRecord]>()
      .mockImplementation(async (card) => new Blob([card.id], { type: "image/jpeg" }));
    const updateCardThumbnail = jest.fn<Promise<boolean>, [string, Blob]>().mockResolvedValue(true);
    const readBackThumbnail = jest
      .fn<Promise<Blob | null>, [string]>()
      .mockResolvedValue(null);
    const invalidateCardThumbnail = jest.fn();
    const dispatchCardsUpdated = jest.fn();
    const logger = { debug: jest.fn(), warn: jest.fn() };

    await refreshCardThumbnailsBatch({
      cardIds: ["card-1"],
      getCard,
      renderThumbnail,
      updateCardThumbnail,
      readBackThumbnail,
      invalidateCardThumbnail,
      dispatchCardsUpdated,
      logger,
    });

    expect(updateCardThumbnail).toHaveBeenCalledTimes(1);
    expect(readBackThumbnail).toHaveBeenCalledWith("card-1");
    expect(invalidateCardThumbnail).not.toHaveBeenCalled();
    expect(dispatchCardsUpdated).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      "[thumbnail-refresh] Thumbnail readback returned no blob",
      expect.objectContaining({ cardId: "card-1", stage: "readback" }),
    );
  });
});
