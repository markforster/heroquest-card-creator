"use client";

import { createContext, useContext } from "react";

import type { ReactNode } from "react";

export type EditorSaveContextValue = {
  saveCurrentCard: () => Promise<boolean>;
  repairCurrentCardThumbnail: () => Promise<boolean>;
  refreshCardThumbnails: (cardIds: string[]) => Promise<void>;
  saveToken: number;
};

export const noopEditorSaveValue: EditorSaveContextValue = {
  saveCurrentCard: async () => false,
  repairCurrentCardThumbnail: async () => false,
  refreshCardThumbnails: async () => {},
  saveToken: 0,
};

const EditorSaveContext = createContext<EditorSaveContextValue | null>(null);

export function EditorSaveProvider({
  value,
  children,
}: {
  value: EditorSaveContextValue;
  children: ReactNode;
}) {
  return <EditorSaveContext.Provider value={value}>{children}</EditorSaveContext.Provider>;
}

export function useEditorSave() {
  const context = useContext(EditorSaveContext);
  if (!context) {
    throw new Error("useEditorSave must be used within EditorSaveProvider");
  }
  return context;
}
