"use client";

import { useEffect, useState } from "react";

import CardFan from "@/components/Decks/CardFan";
import type { CardFanVariant } from "@/components/Decks/CardFan";
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
  previewIds?: string[];
};

export default function DeckFanByDeckId({
  deckId,
  maxCount = 6,
  variant = "sm",
  showPlaceholdersWhenEmpty = true,
  tilt,
  spacing,
  emptyPlaceholderVariant = "default",
  className,
  previewIds,
}: DeckFanByDeckIdProps) {
  const [resolvedPreviewIds, setResolvedPreviewIds] = useState<string[]>(previewIds ?? []);

  useEffect(() => {
    let cancelled = false;

    if (previewIds) {
      setResolvedPreviewIds(previewIds);
      return () => {
        cancelled = true;
      };
    }

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
  }, [deckId, maxCount, previewIds]);

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
