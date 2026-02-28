"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_STAT_LABELS,
  loadStatLabelOverrides,
  saveStatLabelOverrides,
  type StatLabelOverrides,
} from "@/lib/stat-labels";

type StatLabelOverridesContextValue = {
  overrides: StatLabelOverrides;
  setOverrides: (next: StatLabelOverrides) => void;
};

const StatLabelOverridesContext = createContext<StatLabelOverridesContextValue | undefined>(
  undefined,
);

type StatLabelOverridesProviderProps = {
  children: React.ReactNode;
};

export default function StatLabelOverridesProvider({
  children,
}: StatLabelOverridesProviderProps) {
  const [overrides, setOverridesState] = useState<StatLabelOverrides>(DEFAULT_STAT_LABELS);

  useEffect(() => {
    setOverridesState(loadStatLabelOverrides());
  }, []);

  const setOverrides = useCallback((next: StatLabelOverrides) => {
    setOverridesState(next);
    saveStatLabelOverrides(next);
  }, []);

  const value = useMemo<StatLabelOverridesContextValue>(
    () => ({
      overrides,
      setOverrides,
    }),
    [overrides, setOverrides],
  );

  return (
    <StatLabelOverridesContext.Provider value={value}>
      {children}
    </StatLabelOverridesContext.Provider>
  );
}

export function useStatLabelOverrides(): StatLabelOverridesContextValue {
  const ctx = useContext(StatLabelOverridesContext);
  if (!ctx) {
    throw new Error("useStatLabelOverrides must be used within StatLabelOverridesProvider");
  }
  return ctx;
}
