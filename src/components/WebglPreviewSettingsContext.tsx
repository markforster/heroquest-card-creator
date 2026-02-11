"use client";

import { createContext, useContext, useMemo, useState } from "react";

type WebglPreviewSettingsValue = {
  sheenAngle: number;
  setSheenAngle: (value: number) => void;
  sheenIntensity: number;
  setSheenIntensity: (value: number) => void;
};

const WebglPreviewSettingsContext = createContext<WebglPreviewSettingsValue | null>(null);

export function WebglPreviewSettingsProvider({ children }: { children: React.ReactNode }) {
  const [sheenAngle, setSheenAngle] = useState(0.45);
  const [sheenIntensity, setSheenIntensity] = useState(1.1);

  const value = useMemo(
    () => ({
      sheenAngle,
      setSheenAngle,
      sheenIntensity,
      setSheenIntensity,
    }),
    [sheenAngle, sheenIntensity],
  );

  return (
    <WebglPreviewSettingsContext.Provider value={value}>
      {children}
    </WebglPreviewSettingsContext.Provider>
  );
}

export function useWebglPreviewSettings(): WebglPreviewSettingsValue {
  const context = useContext(WebglPreviewSettingsContext);
  if (!context) {
    throw new Error("useWebglPreviewSettings must be used within WebglPreviewSettingsProvider");
  }
  return context;
}
