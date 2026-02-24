"use client";

import { useEffect, useRef, useState } from "react";

import { getCard } from "@/lib/cards-db";

export function useActiveCardSummary(activeCardId?: string) {
  const [currentCardName, setCurrentCardName] = useState<string | null>(null);
  const [currentCardThumbUrl, setCurrentCardThumbUrl] = useState<string | null>(null);
  const currentCardThumbRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const loadCardSummary = async (cardId: string) => {
    try {
      const record = await getCard(cardId);
      if (!record) {
        setCurrentCardName(null);
        if (currentCardThumbRef.current) {
          URL.revokeObjectURL(currentCardThumbRef.current);
          currentCardThumbRef.current = null;
        }
        setCurrentCardThumbUrl(null);
        return;
      }
      setCurrentCardName(record.name || record.title || "Untitled card");
      if (currentCardThumbRef.current) {
        URL.revokeObjectURL(currentCardThumbRef.current);
        currentCardThumbRef.current = null;
      }
      if (record.thumbnailBlob instanceof Blob) {
        const nextUrl = URL.createObjectURL(record.thumbnailBlob);
        currentCardThumbRef.current = nextUrl;
        setCurrentCardThumbUrl(nextUrl);
      } else {
        setCurrentCardThumbUrl(null);
      }
    } catch {
      setCurrentCardName(null);
      if (currentCardThumbRef.current) {
        URL.revokeObjectURL(currentCardThumbRef.current);
        currentCardThumbRef.current = null;
      }
      setCurrentCardThumbUrl(null);
    }
  };

  useEffect(() => {
    if (!activeCardId) {
      setCurrentCardName(null);
      if (currentCardThumbRef.current) {
        URL.revokeObjectURL(currentCardThumbRef.current);
        currentCardThumbRef.current = null;
      }
      setCurrentCardThumbUrl(null);
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
      if (currentCardThumbRef.current) {
        URL.revokeObjectURL(currentCardThumbRef.current);
        currentCardThumbRef.current = null;
      }
    };
  }, [activeCardId]);

  return { currentCardName, currentCardThumbUrl };
}
