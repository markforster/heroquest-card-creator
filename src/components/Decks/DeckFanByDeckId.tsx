"use client";

import { useEffect, useState } from "react";

import CardFan from "@/components/Decks/CardFan";
import type { CardFanVariant } from "@/components/Decks/CardFan";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import { resolveDeckPreviewIds } from "@/components/Decks/deck-preview";

type DeckFanByDeckIdProps = {
  deckId: string;
  maxCount?: number;
  variant?: CardFanVariant;
  showPlaceholdersWhenEmpty?: boolean;
  tilt?: number;
  spacing?: number;
  emptyPlaceholderVariant?: "default" | "deck-empty";
  className?: string;
};

export default function DeckFanByDeckId({
  deckId,
  maxCount = DEFAULT_DECK_FAN_PREVIEW_COUNT,
  variant = "sm",
  showPlaceholdersWhenEmpty = true,
  tilt,
  spacing,
  emptyPlaceholderVariant = "default",
  className,
}: DeckFanByDeckIdProps) {
  const [resolvedPreviewIds, setResolvedPreviewIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      try {
        const next = await resolveDeckPreviewIds({ deckId, maxCount });
        if (!cancelled) {
          setResolvedPreviewIds(next);
        }
      } catch {
        if (!cancelled) {
          setResolvedPreviewIds([]);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [deckId, maxCount]);

  return (
    <CardFan
      cardIds={resolvedPreviewIds}
      variant={variant}
      maxCount={maxCount}
      showPlaceholdersWhenEmpty={showPlaceholdersWhenEmpty}
      tilt={tilt}
      spacing={spacing}
      emptyPlaceholderVariant={emptyPlaceholderVariant}
      className={className}
    />
  );
}
