"use client";

import { createContext, useContext } from "react";

import type { ReactNode } from "react";

type EditorSaveContextValue = {
  saveCurrentCard: () => Promise<boolean>;
  saveToken: number;
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
