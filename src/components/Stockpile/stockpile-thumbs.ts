import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import {
  getCachedCardThumbnailUrl,
  getLegacyCardThumbnailUrl,
  releaseLegacyCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";

export type StockpileThumb = {
  url: string | null;
  onLoad?: () => void;
};

export const resolveStockpileThumb = (id: string, blob: Blob | null): StockpileThumb => {
  if (typeof window === "undefined") {
    return { url: null, onLoad: undefined };
  }
  if (ENABLE_CARD_THUMB_CACHE) {
    return { url: getCachedCardThumbnailUrl(id, blob), onLoad: undefined };
  }
  const url = getLegacyCardThumbnailUrl(id, blob ?? null);
  return {
    url,
    onLoad: url ? () => releaseLegacyCardThumbnailUrl(url) : undefined,
  };
};
