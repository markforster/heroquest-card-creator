"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/api/client";

type CopyrightSettingsContextValue = {
  defaultCopyright: string;
  setDefaultCopyright: (value: string) => void;
  isReady: boolean;
};

const CopyrightSettingsContext = createContext<CopyrightSettingsContextValue | null>(null);

export function CopyrightSettingsProvider({ children }: { children: React.ReactNode }) {
  const [defaultCopyright, setDefaultCopyrightState] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .getDefaultCopyright()
      .then((value) => {
        if (!active) return;
        setDefaultCopyrightState(typeof value === "string" ? value : "");
      })
      .catch(() => {
        if (!active) return;
        setDefaultCopyrightState("");
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setDefaultCopyright = useCallback((value: string) => {
    const normalized = value.trim();
    setDefaultCopyrightState(normalized);
    apiClient
      .setDefaultCopyright({ value: normalized })
      .catch(() => {
      // Ignore persistence failures; UI still reflects latest value.
    });
  }, []);

  const value = useMemo(
    () => ({ defaultCopyright, setDefaultCopyright, isReady }),
    [defaultCopyright, setDefaultCopyright, isReady],
  );

  return (
    <CopyrightSettingsContext.Provider value={value}>
      {children}
    </CopyrightSettingsContext.Provider>
  );
}

export function useCopyrightSettings(): CopyrightSettingsContextValue {
  const ctx = useContext(CopyrightSettingsContext);
  if (!ctx) {
    throw new Error("useCopyrightSettings must be used within CopyrightSettingsProvider");
  }
  return ctx;
}
