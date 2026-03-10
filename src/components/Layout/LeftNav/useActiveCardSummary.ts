"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { useI18n } from "@/i18n/I18nProvider";
import {
  getCachedCardThumbnailUrl,
  getCardThumbnailUrl,
  invalidateCardThumbnail,
  getLegacyCardThumbnailUrl,
  retainCardThumbnail,
  releaseCardThumbnail,
} from "@/lib/card-thumbnail-cache";
import { apiClient } from "@/api/client";

export function useActiveCardSummary(
  activeCardId?: string,
  repairCurrentCardThumbnail?: () => Promise<boolean>,
) {
  const { t } = useI18n();
  const [currentCardName, setCurrentCardName] = useState<string | null>(null);
  const [currentCardThumbUrl, setCurrentCardThumbUrl] = useState<string | null>(null);
  const currentCardThumbRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const retainedCardRef = useRef<string | null>(null);
  const retryGuardRef = useRef<Set<string>>(new Set());

  const loadCardSummary = useCallback(async (cardId: string) => {
    try {
      const record = await apiClient.getCard({ params: { id: cardId } });
      if (!record) {
        setCurrentCardName(null);
        currentCardThumbRef.current = null;
        setCurrentCardThumbUrl(null);
        return;
      }
      setCurrentCardName(record.name || record.title || t("label.untitledCard"));
      currentCardThumbRef.current = null;
      if (ENABLE_CARD_THUMB_CACHE) {
        if (retainedCardRef.current && retainedCardRef.current !== record.id) {
          releaseCardThumbnail(retainedCardRef.current);
          retainedCardRef.current = null;
        }
        if (record.thumbnailBlob instanceof Blob) {
          const nextUrl = getCachedCardThumbnailUrl(record.id, record.thumbnailBlob);
          currentCardThumbRef.current = nextUrl;
          setCurrentCardThumbUrl(nextUrl);
          if (nextUrl && retainedCardRef.current !== record.id) {
            retainCardThumbnail(record.id);
            retainedCardRef.current = record.id;
          }
        } else {
          const nextUrl = await getCardThumbnailUrl(record.id);
          currentCardThumbRef.current = nextUrl;
          setCurrentCardThumbUrl(nextUrl);
          if (nextUrl && retainedCardRef.current !== record.id) {
            retainCardThumbnail(record.id);
            retainedCardRef.current = record.id;
          }
        }
      } else if (record.thumbnailBlob instanceof Blob) {
        const nextUrl = getLegacyCardThumbnailUrl(record.id, record.thumbnailBlob);
        currentCardThumbRef.current = nextUrl;
        setCurrentCardThumbUrl(nextUrl);
      } else {
        currentCardThumbRef.current = null;
        setCurrentCardThumbUrl(null);
      }
    } catch {
      setCurrentCardName(null);
      currentCardThumbRef.current = null;
      setCurrentCardThumbUrl(null);
    }
  }, [t]);

  useEffect(() => {
    if (!activeCardId) {
      setCurrentCardName(null);
      currentCardThumbRef.current = null;
      setCurrentCardThumbUrl(null);
      if (retainedCardRef.current) {
        releaseCardThumbnail(retainedCardRef.current);
        retainedCardRef.current = null;
      }
      return;
    }

    let active = true;
    (async () => {
      await loadCardSummary(activeCardId);
    })();

    const handleCardsUpdated = () => {
      if (!active) return;
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        if (!active) return;
        if (ENABLE_CARD_THUMB_CACHE) {
          if (retainedCardRef.current === activeCardId) {
            releaseCardThumbnail(activeCardId);
            retainedCardRef.current = null;
          }
          invalidateCardThumbnail(activeCardId);
        }
        void loadCardSummary(activeCardId);
      }, 200);
    };

    window.addEventListener("hqcc-cards-updated", handleCardsUpdated);

    return () => {
      active = false;
      window.removeEventListener("hqcc-cards-updated", handleCardsUpdated);
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      currentCardThumbRef.current = null;
      if (ENABLE_CARD_THUMB_CACHE && retainedCardRef.current) {
        releaseCardThumbnail(retainedCardRef.current);
        retainedCardRef.current = null;
      }
    };
  }, [activeCardId, loadCardSummary]);

  const retryThumbnail = () => {
    if (!activeCardId || !ENABLE_CARD_THUMB_CACHE) return;
    if (retryGuardRef.current.has(activeCardId)) return;
    retryGuardRef.current.add(activeCardId);
    void (async () => {
      if (repairCurrentCardThumbnail) {
        try {
          await repairCurrentCardThumbnail();
        } catch {
          // Ignore repair failures.
        }
      }
      invalidateCardThumbnail(activeCardId);
      await loadCardSummary(activeCardId);
    })();
  };

  return { currentCardName, currentCardThumbUrl, retryThumbnail };
}
