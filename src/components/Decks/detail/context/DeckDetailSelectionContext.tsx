"use client";

import { createContext, useContext } from "react";

import type { PropsWithChildren } from "react";
import type { DeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";

const DeckDetailSelectionContext = createContext<DeckDetailSelectionModel | null>(null);

export function DeckDetailSelectionProvider({
  model,
  children,
}: PropsWithChildren<{ model: DeckDetailSelectionModel }>) {
  return (
    <DeckDetailSelectionContext.Provider value={model}>
      {children}
    </DeckDetailSelectionContext.Provider>
  );
}

export function useDeckDetailSelection(): DeckDetailSelectionModel {
  const context = useContext(DeckDetailSelectionContext);
  if (!context) {
    throw new Error("useDeckDetailSelection must be used within DeckDetailSelectionProvider");
  }
  return context;
}
