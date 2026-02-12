"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type WebglPreviewSettingsValue = {
  sheenAngle: number;
  setSheenAngle: (value: number) => void;
  sheenIntensity: number;
  setSheenIntensity: (value: number) => void;
};

const WebglPreviewSettingsContext = createContext<WebglPreviewSettingsValue | null>(null);
const STORAGE_KEY = "hqcc.webglPreviewSettings";

export function WebglPreviewSettingsProvider({ children }: { children: React.ReactNode }) {
  const [sheenAngle, setSheenAngle] = useState(0.45);
  const [sheenIntensity, setSheenIntensity] = useState(1.1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        sheenAngle?: number;
        sheenIntensity?: number;
      };
      if (typeof parsed.sheenAngle === "number") {
        setSheenAngle(parsed.sheenAngle);
      }
      if (typeof parsed.sheenIntensity === "number") {
        setSheenIntensity(parsed.sheenIntensity);
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sheenAngle,
          sheenIntensity,
        }),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [sheenAngle, sheenIntensity]);

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
