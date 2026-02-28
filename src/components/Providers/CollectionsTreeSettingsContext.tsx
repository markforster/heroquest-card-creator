"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type CollectionsTreeSettingsValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  expandedPaths: Set<string>;
  setExpandedPaths: (next: Iterable<string>) => void;
  togglePath: (pathId: string) => void;
  hasStoredExpandedPaths: boolean;
  isReady: boolean;
};

const CollectionsTreeSettingsContext = createContext<CollectionsTreeSettingsValue | null>(null);

const ENABLED_KEY = "hqcc.collectionsTreeEnabled";
const EXPANDED_KEY = "hqcc.collectionsTreeExpanded";

const parseExpandedPaths = (value: string | null): Set<string> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const filtered = parsed.filter((entry) => typeof entry === "string") as string[];
    return new Set(filtered);
  } catch {
    return null;
  }
};

export function CollectionsTreeSettingsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [expandedPaths, setExpandedPathsState] = useState<Set<string>>(new Set());
  const [hasStoredExpandedPaths, setHasStoredExpandedPaths] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedEnabled = window.localStorage.getItem(ENABLED_KEY);
      if (storedEnabled === "1" || storedEnabled === "true") {
        setEnabledState(true);
      }
      const storedExpanded = parseExpandedPaths(window.localStorage.getItem(EXPANDED_KEY));
      if (storedExpanded) {
        setExpandedPathsState(storedExpanded);
        setHasStoredExpandedPaths(true);
      }
    } catch {
      // Ignore storage errors.
    } finally {
      setIsReady(true);
    }
  }, []);

  const persistEnabled = useCallback((next: boolean) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ENABLED_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const persistExpanded = useCallback((next: Set<string>) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(EXPANDED_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      persistEnabled(next);
    },
    [persistEnabled],
  );

  const setExpandedPaths = useCallback(
    (next: Iterable<string>) => {
      const nextSet = new Set(next);
      setExpandedPathsState(nextSet);
      setHasStoredExpandedPaths(true);
      persistExpanded(nextSet);
    },
    [persistExpanded],
  );

  const togglePath = useCallback(
    (pathId: string) => {
      setExpandedPathsState((prev) => {
        const next = new Set(prev);
        if (next.has(pathId)) {
          next.delete(pathId);
        } else {
          next.add(pathId);
        }
        setHasStoredExpandedPaths(true);
        persistExpanded(next);
        return next;
      });
    },
    [persistExpanded],
  );

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      expandedPaths,
      setExpandedPaths,
      togglePath,
      hasStoredExpandedPaths,
      isReady,
    }),
    [enabled, expandedPaths, hasStoredExpandedPaths, isReady, setEnabled, setExpandedPaths, togglePath],
  );

  return (
    <CollectionsTreeSettingsContext.Provider value={value}>
      {children}
    </CollectionsTreeSettingsContext.Provider>
  );
}

export function useCollectionsTreeSettings(): CollectionsTreeSettingsValue {
  const ctx = useContext(CollectionsTreeSettingsContext);
  if (!ctx) {
    throw new Error("useCollectionsTreeSettings must be used within CollectionsTreeSettingsProvider");
  }
  return ctx;
}
