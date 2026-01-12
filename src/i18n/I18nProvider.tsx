"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { messages, supportedLanguages } from "./messages";
import { getInitialLanguage, LANGUAGE_STORAGE_KEY } from "./getInitialLanguage";

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

export function I18nProvider({ children }: Props) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() =>
    getInitialLanguage(LANGUAGE_STORAGE_KEY),
  );

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    const next = isSupportedLanguage(lang) ? lang : ("en" satisfies SupportedLanguage);
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
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

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
