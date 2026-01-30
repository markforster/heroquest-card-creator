"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { SHOW_BLUEPRINTS_TOGGLE, USE_BLUEPRINTS } from "@/config/flags";

export type PreviewMode = "legacy" | "blueprint";

type PreviewModeContextValue = {
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
  togglePreviewMode: () => void;
};

const PREVIEW_MODE_STORAGE_KEY = "hqcc.previewMode";
const FORCED_MODE: PreviewMode | null = USE_BLUEPRINTS ? "blueprint" : null;

const PreviewModeContext = createContext<PreviewModeContextValue | null>(null);

export function PreviewModeProvider({ children }: { children: React.ReactNode }) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>(FORCED_MODE ?? "legacy");

  useEffect(() => {
    if (FORCED_MODE) {
      setPreviewMode(FORCED_MODE);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(PREVIEW_MODE_STORAGE_KEY);
      if (stored === "legacy" || stored === "blueprint") {
        setPreviewMode(stored);
      }
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  useEffect(() => {
    if (FORCED_MODE) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREVIEW_MODE_STORAGE_KEY, previewMode);
    } catch {
      // Ignore localStorage errors.
    }
  }, [previewMode]);

  const value = useMemo<PreviewModeContextValue>(
    () => ({
      previewMode,
      setPreviewMode: (mode) => {
        if (FORCED_MODE) return;
        setPreviewMode(mode);
      },
      togglePreviewMode: () => {
        if (FORCED_MODE) return;
        setPreviewMode((prev) => (prev === "legacy" ? "blueprint" : "legacy"));
      },
    }),
    [previewMode],
  );

  return <PreviewModeContext.Provider value={value}>{children}</PreviewModeContext.Provider>;
}

export function usePreviewMode(): PreviewModeContextValue {
  const context = useContext(PreviewModeContext);
  if (!context) {
    throw new Error("usePreviewMode must be used within PreviewModeProvider");
  }
  return context;
}

export const previewModeFlags = {
  SHOW_BLUEPRINTS_TOGGLE,
  USE_BLUEPRINTS,
};
