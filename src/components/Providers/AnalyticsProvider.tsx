"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import { APP_VERSION } from "@/version";
type AnalyticsTrackParams = Record<string, string | number | boolean | null | undefined>;

type AnalyticsContextValue = {
  track: (event: string, params?: AnalyticsTrackParams) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

type AnalyticsProviderProps = {
  gaId?: string;
  children: React.ReactNode;
};

export function AnalyticsProvider({ gaId, children }: AnalyticsProviderProps) {
  const track = useCallback<AnalyticsContextValue["track"]>(
    (event, params) => {
      if (!gaId) return;
      if (typeof window === "undefined") return;
      const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag !== "function") return;
      gtag("event", event, {
        app_version: APP_VERSION,
        ...(params ?? {}),
        send_to: gaId,
      });
    },
    [gaId],
  );

  const value = useMemo<AnalyticsContextValue>(() => ({ track }), [track]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalytics must be used within AnalyticsProvider");
  }
  return ctx;
}
