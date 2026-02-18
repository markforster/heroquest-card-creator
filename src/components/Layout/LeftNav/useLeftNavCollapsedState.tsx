"use client";
import { useState, useEffect } from "react";

export function useLeftNavCollapsedState(storageKey: string) {
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const [isCollapsedReady, setIsCollapsedReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "true") {
        setManualCollapsed(true);
      }
      setIsCollapsedReady(true);
    } catch {
      // Ignore localStorage errors.
      setIsCollapsedReady(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, String(manualCollapsed));
    } catch {
      // Ignore localStorage errors.
    }
  }, [manualCollapsed, storageKey]);

  return { manualCollapsed, setManualCollapsed, isCollapsedReady };
}
