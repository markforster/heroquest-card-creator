import { supportedLanguages } from "./messages";

import type { SupportedLanguage } from "./messages";

export const LANGUAGE_STORAGE_KEY = "hqcc.language";

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage);
}

export function getInitialLanguage(
  storageKey: string = LANGUAGE_STORAGE_KEY,
): SupportedLanguage {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored && isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }

  const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "";
  const [primary] = browserLanguage.split("-");
  if (primary && isSupportedLanguage(primary)) {
    return primary;
  }

  return "en";
}

