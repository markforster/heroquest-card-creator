"use client";

import { createContext, useContext } from "react";

import { useDeckRightPanelModel } from "@/components/Decks/hooks/useDeckRightPanelModel";

import type { PropsWithChildren } from "react";

type DeckRightPanelModel = ReturnType<typeof useDeckRightPanelModel>;

const DeckRightPanelContext = createContext<DeckRightPanelModel | null>(null);

export function DeckRightPanelProvider({ children }: PropsWithChildren) {
  const model = useDeckRightPanelModel();
  return <DeckRightPanelContext.Provider value={model}>{children}</DeckRightPanelContext.Provider>;
}

export function useDeckRightPanel(): DeckRightPanelModel {
  const context = useContext(DeckRightPanelContext);
  if (!context) {
    throw new Error("useDeckRightPanel must be used within DeckRightPanelProvider");
  }
  return context;
}
