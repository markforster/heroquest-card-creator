import isSupportedLanguage from "./isSupportedLanguage";
import { supportedLanguages } from "./messages";

import type { SupportedLanguage } from "./messages";

export const LANGUAGE_STORAGE_KEY = "hqcc.language";


function normalizeLanguageTag(value: string): string {
  return value.trim().replace(/_/g, "-");
}

function matchSupportedLanguage(tag: string): SupportedLanguage | null {
  const normalized = normalizeLanguageTag(tag);
  if (!normalized) return null;

  const exact = supportedLanguages.find(
    (language) => language.toLowerCase() === normalized.toLowerCase(),
  );
  if (exact) return exact;

  const [primary] = normalized.split("-");
  if (!primary) return null;

  const primaryMatch = supportedLanguages.find(
    (language) => language.toLowerCase() === primary.toLowerCase(),
  );
  return primaryMatch ?? null;
}

export function getDetectedLanguage(): SupportedLanguage | null {
  if (typeof navigator === "undefined") return null;

  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = matchSupportedLanguage(candidate);
    if (match) return match;
  }

  return null;
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

  const detected = getDetectedLanguage();
  if (detected) return detected;

  return "en";
}
