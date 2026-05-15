"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import IconButton from "@/components/common/IconButton";
import { useDeckExport } from "@/components/Decks/context/DeckExportContext";
import { useDeckHasSets } from "@/components/Decks/hooks/useDeckHasSets";

type DeckExportButtonProps = {
  deckId?: string | null;
  scope: "decks_grid" | "deck_detail";
  disabled?: boolean;
  label?: string;
  className?: string;
};

export default function DeckExportButton({
  deckId,
  scope,
  disabled,
  label = "Export Deck",
  className = "btn btn-outline-light btn-sm",
}: DeckExportButtonProps) {
  const exportContext = useDeckExport();
  const exportDeck = exportContext?.exportDeck;
  const { hasSets } = useDeckHasSets(deckId);
  const [isLoading, setIsLoading] = useState(false);

  const isDisabled = disabled || !deckId || !hasSets || isLoading || !exportDeck;

  return (
    <IconButton
      className={className}
      icon={Download}
      title={label}
      disabled={Boolean(isDisabled)}
      onClick={async () => {
        if (!deckId || isLoading || !exportDeck) return;
        setIsLoading(true);
        try {
          await exportDeck(deckId, scope);
        } finally {
          setIsLoading(false);
        }
      }}
    >
      {label}
    </IconButton>
  );
}
