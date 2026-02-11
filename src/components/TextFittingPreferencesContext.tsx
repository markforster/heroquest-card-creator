"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { PreferencesByRole, TextRole } from "@/lib/text-fitting/types";
import {
  getDefaultTextFittingPreferences,
  getTextFittingPreferences,
  mergeTextFittingPreferences,
  storeTextFittingPreferences,
} from "@/lib/text-fitting/preferences";

type TextFittingPreferencesContextValue = {
  preferences: PreferencesByRole;
  setRolePreferences: (role: TextRole, updates: Partial<PreferencesByRole[TextRole]>) => void;
  resetRolePreferences: (role: TextRole) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
};

const TextFittingPreferencesContext = createContext<TextFittingPreferencesContextValue | null>(null);

export function TextFittingPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<PreferencesByRole>({
    title: getTextFittingPreferences("title"),
    statHeading: getTextFittingPreferences("statHeading"),
  });
  const [isDragging, setIsDragging] = useState(false);
  const saveTimeoutsRef = useRef<Record<TextRole, number | null>>({
    title: null,
    statHeading: null,
  });

  useEffect(() => {
    setPreferences({
      title: getTextFittingPreferences("title"),
      statHeading: getTextFittingPreferences("statHeading"),
    });
  }, []);

  const setRolePreferences = useCallback(
    (role: TextRole, updates: Partial<PreferencesByRole[TextRole]>) => {
      setPreferences((prev) => {
        const nextRolePrefs = mergeTextFittingPreferences(role, prev[role], updates);
        const next = { ...prev, [role]: nextRolePrefs } as PreferencesByRole;
        if (typeof window !== "undefined") {
          const existing = saveTimeoutsRef.current[role];
          if (existing) {
            window.clearTimeout(existing);
          }
          saveTimeoutsRef.current[role] = window.setTimeout(() => {
            storeTextFittingPreferences(role, nextRolePrefs);
            saveTimeoutsRef.current[role] = null;
          }, 150);
        } else {
          storeTextFittingPreferences(role, nextRolePrefs);
        }
        return next;
      });
    },
    [],
  );

  const resetRolePreferences = useCallback((role: TextRole) => {
    setPreferences((prev) => {
      const defaults = getDefaultTextFittingPreferences(role);
      const next = { ...prev, [role]: defaults } as PreferencesByRole;
      storeTextFittingPreferences(role, defaults);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      setRolePreferences,
      resetRolePreferences,
      isDragging,
      setIsDragging,
    }),
    [preferences, setRolePreferences, resetRolePreferences, isDragging],
  );

  return (
    <TextFittingPreferencesContext.Provider value={value}>
      {children}
    </TextFittingPreferencesContext.Provider>
  );
}

export function useTextFittingPreferences(): TextFittingPreferencesContextValue {
  const context = useContext(TextFittingPreferencesContext);
  if (!context) {
    throw new Error("useTextFittingPreferences must be used within TextFittingPreferencesProvider");
  }
  return context;
}
