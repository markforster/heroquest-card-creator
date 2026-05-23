"use client";

import { createContext, useContext } from "react";

type DeckExportContextValue = {
  exportDeck: (deckId: string, scope: "decks_grid" | "deck_detail") => Promise<void>;
  exportDeckPdf: (deckId: string, scope: "decks_grid" | "deck_detail") => Promise<void>;
};

const DeckExportContext = createContext<DeckExportContextValue | null>(null);

export function DeckExportProvider({
  value,
  children,
}: {
  value: DeckExportContextValue;
  children: React.ReactNode;
}) {
  return <DeckExportContext.Provider value={value}>{children}</DeckExportContext.Provider>;
}

export function useDeckExport() {
  return useContext(DeckExportContext);
}
