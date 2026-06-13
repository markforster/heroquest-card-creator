"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";

import { getInitialLanguage, LANGUAGE_STORAGE_KEY } from "./getInitialLanguage";
import i18n, { ensureI18nInitialized } from "./i18n";
import isSupportedLanguage from "./isSupportedLanguage";
import { namespaceForMessageKey } from "./resources";

import type { MessageKey, SupportedLanguage } from "./messages";

type TranslateOptions = Record<string, unknown>;

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: MessageKey, options?: TranslateOptions) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

ensureI18nInitialized();

export function I18nProvider({ children }: Props) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    const next = getInitialLanguage(LANGUAGE_STORAGE_KEY);
    setLanguageState(next);
    void i18n.changeLanguage(next);

    const handleLanguageChanged = (value: string) => {
      if (isSupportedLanguage(value)) {
        setLanguageState(value);
      }
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    const next = isSupportedLanguage(lang) ? lang : ("en" satisfies SupportedLanguage);
    setLanguageState(next);
    void i18n.changeLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: MessageKey, options?: TranslateOptions): string => {
    const namespace = namespaceForMessageKey(key);
    return i18n.t(key, {
      ns: namespace,
      defaultValue: key,
      ...options,
    });
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    </I18nextProvider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
