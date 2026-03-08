"use client";

import { createContext, useContext, useMemo, useState } from "react";

import {
  DEFAULT_BLEED_PX,
  DEFAULT_CROP_MARK_COLOR,
  DEFAULT_CROP_MARK_STYLE,
  DEFAULT_CUT_MARK_COLOR,
  DEFAULT_EXPORT_ROUNDED_CORNERS,
  getExportSettings,
  setExportSettings,
  type ExportSettings,
} from "@/lib/export-settings";

import type { ReactNode } from "react";


type ExportSettingsContextValue = {
  settings: ExportSettings;
  updateSettings: (next: ExportSettings) => void;
};

const DEFAULT_SETTINGS: ExportSettings = {
  bleed: { enabled: false, bleedPx: DEFAULT_BLEED_PX, askBeforeExport: false },
  cropMarks: { enabled: false, color: DEFAULT_CROP_MARK_COLOR, style: DEFAULT_CROP_MARK_STYLE },
  cutMarks: { enabled: false, color: DEFAULT_CUT_MARK_COLOR },
  roundedCorners: DEFAULT_EXPORT_ROUNDED_CORNERS,
};

const ExportSettingsContext = createContext<ExportSettingsContextValue | null>(null);

export function ExportSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ExportSettings>(() => {
    try {
      return getExportSettings();
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const value = useMemo(
    () => ({
      settings,
      updateSettings: (next: ExportSettings) => {
        setSettings(next);
        setExportSettings(next);
      },
    }),
    [settings],
  );

  return <ExportSettingsContext.Provider value={value}>{children}</ExportSettingsContext.Provider>;
}

export function useExportSettingsState() {
  const context = useContext(ExportSettingsContext);
  if (!context) {
    throw new Error("useExportSettingsState must be used within ExportSettingsProvider");
  }
  return context;
}
