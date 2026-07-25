"use client";

import type { CardRecord } from "@/api/cards";

type ThumbnailRefreshLogger = Pick<Console, "debug" | "warn">;

const RENDER_TIMEOUT_MS = 8000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      onTimeout();
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

type RefreshCardThumbnailsArgs = {
  cardIds: string[];
  getCard: (cardId: string) => Promise<CardRecord | null>;
  renderThumbnail: (card: CardRecord) => Promise<Blob | null>;
  updateCardThumbnail: (cardId: string, thumbnailBlob: Blob) => Promise<boolean>;
  readBackThumbnail: (cardId: string) => Promise<Blob | null>;
  invalidateCardThumbnail: (cardId: string) => void;
  dispatchCardsUpdated: () => void;
  logger?: ThumbnailRefreshLogger;
};

export async function refreshCardThumbnailsBatch({
  cardIds,
  getCard,
  renderThumbnail,
  updateCardThumbnail,
  readBackThumbnail,
  invalidateCardThumbnail,
  dispatchCardsUpdated,
  logger = console,
}: RefreshCardThumbnailsArgs): Promise<void> {
  const uniqueIds = Array.from(new Set(cardIds.filter(Boolean)));
  if (!uniqueIds.length) return;

  let updatedAny = false;

  for (let index = 0; index < uniqueIds.length; index += 1) {
    const cardId = uniqueIds[index];

    let card: CardRecord | null = null;
    try {
      card = await getCard(cardId);
    } catch (error) {
      logger.warn("[thumbnail-refresh] Failed to fetch card", { cardId, stage: "fetch", error });
      continue;
    }

    if (!card) {
      logger.warn("[thumbnail-refresh] Card was not found for thumbnail refresh", {
        cardId,
        stage: "fetch",
      });
      continue;
    }

    if (card.status !== "saved") {
      logger.warn("[thumbnail-refresh] Skipping non-saved card thumbnail refresh", {
        cardId,
        stage: "fetch",
        status: card.status,
      });
      continue;
    }

    let thumbnailBlob: Blob | null = null;
    try {
      thumbnailBlob = await withTimeout(renderThumbnail(card), RENDER_TIMEOUT_MS, () => {
        logger.warn("[thumbnail-refresh] Timed out while rendering thumbnail", {
          cardId,
          stage: "render",
          timeoutMs: RENDER_TIMEOUT_MS,
        });
      });
    } catch (error) {
      logger.warn("[thumbnail-refresh] Failed to render thumbnail", { cardId, stage: "render", error });
      continue;
    }

    if (!(thumbnailBlob instanceof Blob)) {
      logger.warn("[thumbnail-refresh] Thumbnail render returned no blob", {
        cardId,
        stage: "render",
      });
      continue;
    }

    let updated = false;
    try {
      updated = await updateCardThumbnail(cardId, thumbnailBlob);
    } catch (error) {
      logger.warn("[thumbnail-refresh] Failed to persist thumbnail", {
        cardId,
        stage: "persist",
        error,
      });
      continue;
    }

    if (!updated) {
      logger.warn("[thumbnail-refresh] Thumbnail persistence reported no update", {
        cardId,
        stage: "persist",
      });
      continue;
    }

    let persistedBlob: Blob | null = null;
    try {
      persistedBlob = await readBackThumbnail(cardId);
    } catch (error) {
      logger.warn("[thumbnail-refresh] Failed to read back persisted thumbnail", {
        cardId,
        stage: "readback",
        error,
      });
      continue;
    }

    if (!(persistedBlob instanceof Blob)) {
      logger.warn("[thumbnail-refresh] Thumbnail readback returned no blob", {
        cardId,
        stage: "readback",
      });
      continue;
    }

    updatedAny = true;
    invalidateCardThumbnail(cardId);
  }

  if (updatedAny) {
    dispatchCardsUpdated();
  }
}
