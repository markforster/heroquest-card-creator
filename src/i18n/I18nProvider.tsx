"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { messages } from "./messages";

import type { MessageKey, SupportedLanguage } from "./messages";

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

const STORAGE_KEY = "hqcc.language";

function getInitialLanguage(): SupportedLanguage {
  // For now we always use English regardless of browser/LS.
  return "en";
}

export function I18nProvider({ children }: Props) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => getInitialLanguage());

  const setLanguage = useCallback(() => {
    // Language switching is currently disabled; always clamp to English.
    const next = "en" satisfies SupportedLanguage;
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: MessageKey): string => {
      const bundle = messages[language] ?? messages.en;
      return bundle[key] ?? messages.en[key] ?? key;
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
