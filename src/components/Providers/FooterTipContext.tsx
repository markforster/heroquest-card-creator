"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { ReactNode } from "react";

export type FooterTipIcon = "lightbulb";

export type FooterTip = {
  source: string;
  message: string;
  icon?: FooterTipIcon;
};

type FooterTipContextValue = {
  currentTip: FooterTip | null;
  setTip: (source: string, message: string, icon?: FooterTipIcon) => void;
  clearTip: (source: string) => void;
};

const FooterTipContext = createContext<FooterTipContextValue | null>(null);

export function FooterTipProvider({ children }: { children: ReactNode }) {
  const [currentTip, setCurrentTip] = useState<FooterTip | null>(null);

  const setTip = useCallback((source: string, message: string, icon?: FooterTipIcon) => {
    setCurrentTip((prev) => {
      if (prev?.source === source && prev.message === message && prev.icon === icon) {
        return prev;
      }
      return { source, message, icon };
    });
  }, []);

  const clearTip = useCallback((source: string) => {
    setCurrentTip((prev) => (prev?.source === source ? null : prev));
  }, []);

  const value = useMemo<FooterTipContextValue>(
    () => ({
      currentTip,
      setTip,
      clearTip,
    }),
    [clearTip, currentTip, setTip],
  );

  return <FooterTipContext.Provider value={value}>{children}</FooterTipContext.Provider>;
}

export function useFooterTip() {
  const context = useContext(FooterTipContext);
  if (!context) {
    throw new Error("useFooterTip must be used within FooterTipProvider");
  }
  return context;
}
