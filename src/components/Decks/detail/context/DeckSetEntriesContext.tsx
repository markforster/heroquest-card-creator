"use client";

import { createContext, useContext } from "react";

import type { PropsWithChildren } from "react";
import type { DeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";

const DeckSetEntriesContext = createContext<DeckSetEntriesModel | null>(null);

export function DeckSetEntriesProvider({
  model,
  children,
}: PropsWithChildren<{ model: DeckSetEntriesModel }>) {
  return <DeckSetEntriesContext.Provider value={model}>{children}</DeckSetEntriesContext.Provider>;
}

export function useDeckSetEntries(): DeckSetEntriesModel {
  const context = useContext(DeckSetEntriesContext);
  if (!context) {
    throw new Error("useDeckSetEntries must be used within DeckSetEntriesProvider");
  }
  return context;
}
