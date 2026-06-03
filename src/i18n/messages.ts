/* istanbul ignore file */
import type { TemplateId } from "@/types/templates";

import { resources } from "./resources";

export const supportedLanguages = [
  "en",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "pt-BR",
  "nl",
  "el",
  "hu",
  "pl",
  "cs",
  "sv",
  "fi",
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageLabels: Record<SupportedLanguage, string> = {
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
  de: "🇩🇪 Deutsch",
  es: "🇪🇸 Español",
  it: "🇮🇹 Italiano",
  pt: "🇵🇹 Português",
  "pt-BR": "🇧🇷 Português (Brasil)",
  nl: "🇳🇱 Nederlands",
  el: "🇬🇷 Ελληνικά",
  hu: "🇭🇺 Magyar",
  pl: "🇵🇱 Polski",
  cs: "🇨🇿 Čeština",
  sv: "🇸🇪 Svenska",
  fi: "🇫🇮 Suomi",
};

type EnglishResources = typeof resources.en;

export type MessageKey = {
  [NS in keyof EnglishResources]: keyof EnglishResources[NS];
}[keyof EnglishResources] & string;

type FlattenedMessages = Record<MessageKey, string>;

function flattenMessages(language: SupportedLanguage): FlattenedMessages {
  return {
    ...resources[language].common,
    ...resources[language].decks,
    ...resources[language].formattingHelp,
    ...resources[language].templates,
  } as FlattenedMessages;
}

export const messages: Record<SupportedLanguage, FlattenedMessages> = supportedLanguages.reduce(
  (acc, language) => {
    acc[language] = flattenMessages(language);
    return acc;
  },
  {} as Record<SupportedLanguage, FlattenedMessages>,
);

const TEMPLATE_LABEL_KEYS: Record<TemplateId, MessageKey> = {
  hero: "templates.hero",
  monster: "templates.monster",
  "small-treasure": "templates.small-treasure",
  "large-treasure": "templates.large-treasure",
  "hero-back": "templates.hero-back",
  "labelled-back": "templates.labelled-back",
};

export const templateNameLabels: Record<SupportedLanguage, Partial<Record<TemplateId, string>>> =
  supportedLanguages.reduce(
    (acc, language) => {
      const bundle = messages[language];
      acc[language] = Object.fromEntries(
        Object.entries(TEMPLATE_LABEL_KEYS).map(([templateId, key]) => [
          templateId,
          bundle[key],
        ]),
      ) as Partial<Record<TemplateId, string>>;
      return acc;
    },
    {} as Record<SupportedLanguage, Partial<Record<TemplateId, string>>>,
  );
