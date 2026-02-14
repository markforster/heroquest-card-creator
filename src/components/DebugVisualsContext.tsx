"use client";

import { createContext, useContext, useMemo } from "react";

import { useLocalStorageBoolean } from "@/components/LocalStorageProvider";

import type { ReactNode } from "react";

type DebugVisualsContextValue = {
  showTextBounds: boolean;
  setShowTextBounds: (value: boolean) => void;
};

const DebugVisualsContext = createContext<DebugVisualsContextValue | null>(null);
const DEBUG_TEXT_BOUNDS_KEY = "hqcc.debugTextBounds";

type DebugVisualsProviderProps = {
  children: ReactNode;
};

export function DebugVisualsProvider({ children }: DebugVisualsProviderProps) {
  const [showTextBounds, setShowTextBounds] = useLocalStorageBoolean(
    DEBUG_TEXT_BOUNDS_KEY,
    false,
  );

  const value = useMemo(
    () => ({ showTextBounds, setShowTextBounds }),
    [showTextBounds, setShowTextBounds],
  );

  return <DebugVisualsContext.Provider value={value}>{children}</DebugVisualsContext.Provider>;
}

export function useDebugVisuals(): DebugVisualsContextValue {
  const ctx = useContext(DebugVisualsContext);
  if (!ctx) {
    throw new Error("useDebugVisuals must be used within DebugVisualsProvider");
  }
  return ctx;
}
