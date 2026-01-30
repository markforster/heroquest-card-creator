"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { SHOW_INSPECTOR_TOGGLE, USE_GENERIC_INSPECTOR } from "@/config/flags";

export type InspectorMode = "legacy" | "generic";

type InspectorModeContextValue = {
  inspectorMode: InspectorMode;
  setInspectorMode: (mode: InspectorMode) => void;
  toggleInspectorMode: () => void;
};

const INSPECTOR_MODE_STORAGE_KEY = "hqcc.inspectorMode";
const FORCED_MODE: InspectorMode | null = USE_GENERIC_INSPECTOR ? "generic" : null;

const InspectorModeContext = createContext<InspectorModeContextValue | null>(null);

export function InspectorModeProvider({ children }: { children: React.ReactNode }) {
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(FORCED_MODE ?? "legacy");

  useEffect(() => {
    if (FORCED_MODE) {
      setInspectorMode(FORCED_MODE);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(INSPECTOR_MODE_STORAGE_KEY);
      if (stored === "legacy" || stored === "generic") {
        setInspectorMode(stored);
      }
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  useEffect(() => {
    if (FORCED_MODE) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(INSPECTOR_MODE_STORAGE_KEY, inspectorMode);
    } catch {
      // Ignore localStorage errors.
    }
  }, [inspectorMode]);

  const value = useMemo<InspectorModeContextValue>(
    () => ({
      inspectorMode,
      setInspectorMode: (mode) => {
        if (FORCED_MODE) return;
        setInspectorMode(mode);
      },
      toggleInspectorMode: () => {
        if (FORCED_MODE) return;
        setInspectorMode((prev) => (prev === "legacy" ? "generic" : "legacy"));
      },
    }),
    [inspectorMode],
  );

  return <InspectorModeContext.Provider value={value}>{children}</InspectorModeContext.Provider>;
}

export function useInspectorMode(): InspectorModeContextValue {
  const context = useContext(InspectorModeContext);
  if (!context) {
    throw new Error("useInspectorMode must be used within InspectorModeProvider");
  }
  return context;
}

export const inspectorModeFlags = {
  SHOW_INSPECTOR_TOGGLE,
  USE_GENERIC_INSPECTOR,
};
