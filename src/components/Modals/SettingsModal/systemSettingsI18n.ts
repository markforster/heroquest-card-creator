import type { MessageKey, SupportedLanguage } from "@/i18n/messages";

const STORE_LABEL_KEYS: Record<string, MessageKey> = {
  assets: "label.storeAssets",
  cards: "label.storeCards",
  collections: "label.storeCollections",
  meta: "label.storeMeta",
  pairs: "label.storePairs",
  settings: "label.storeSettings",
  "everything-else": "label.storeEverythingElse",
  "other-browser-storage": "label.storeOtherBrowserStorage",
};

const SYSTEM_SETTINGS_LOCALES: Record<SupportedLanguage, string> = {
  en: "en-GB",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  "pt-BR": "pt-BR",
  nl: "nl-NL",
  el: "el-GR",
  hu: "hu-HU",
  pl: "pl-PL",
  cs: "cs-CZ",
  sv: "sv-SE",
  fi: "fi-FI",
};

function humanizeStoreName(store: string): string {
  const normalized = store.trim().replace(/[-_]+/g, " ");
  if (!normalized) return store;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getSystemSettingsStoreLabel(
  store: string,
  t: (key: MessageKey) => string,
): string {
  const key = STORE_LABEL_KEYS[store];
  return key ? t(key) : humanizeStoreName(store);
}

export function formatSystemSettingsTimestamp(
  date: Date,
  language: SupportedLanguage,
): string {
  return new Intl.DateTimeFormat(SYSTEM_SETTINGS_LOCALES[language], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
