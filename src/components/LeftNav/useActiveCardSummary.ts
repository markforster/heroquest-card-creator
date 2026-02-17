"use client";

import { useEffect, useRef, useState } from "react";

import { getCard } from "@/lib/cards-db";

export function useActiveCardSummary(activeCardId?: string) {
  const [currentCardName, setCurrentCardName] = useState<string | null>(null);
  const [currentCardThumbUrl, setCurrentCardThumbUrl] = useState<string | null>(null);
  const currentCardThumbRef = useRef<string | null>(null);

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
      try {
        const record = await getCard(activeCardId);
        if (!active || !record) return;
        setCurrentCardName(record.name || record.title || "Untitled card");
        if (currentCardThumbRef.current) {
          URL.revokeObjectURL(currentCardThumbRef.current);
          currentCardThumbRef.current = null;
        }
        if (record.thumbnailBlob) {
          const nextUrl = URL.createObjectURL(record.thumbnailBlob);
          currentCardThumbRef.current = nextUrl;
          setCurrentCardThumbUrl(nextUrl);
        } else {
          setCurrentCardThumbUrl(null);
        }
      } catch {
        if (!active) return;
        setCurrentCardName(null);
        if (currentCardThumbRef.current) {
          URL.revokeObjectURL(currentCardThumbRef.current);
          currentCardThumbRef.current = null;
        }
        setCurrentCardThumbUrl(null);
      }
    })();

    return () => {
      active = false;
      if (currentCardThumbRef.current) {
        URL.revokeObjectURL(currentCardThumbRef.current);
        currentCardThumbRef.current = null;
      }
    };
  }, [activeCardId]);

  return { currentCardName, currentCardThumbUrl };
}
