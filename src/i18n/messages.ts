/* istanbul ignore file */
import type { TemplateId } from "@/types/templates";

import { cs } from "./messages/cs";
import { de } from "./messages/de";
import { el } from "./messages/el";
import { en } from "./messages/en";
import { es } from "./messages/es";
import { fi } from "./messages/fi";
import { fr } from "./messages/fr";
import { hu } from "./messages/hu";
import { it } from "./messages/it";
import { nl } from "./messages/nl";
import { pl } from "./messages/pl";
import { pt } from "./messages/pt";
import { ptBR } from "./messages/pt-BR";
import { sv } from "./messages/sv";

export type SupportedLanguage =
  | "en"
  | "fr"
  | "de"
  | "es"
  | "it"
  | "pt"
  | "pt-BR"
  | "nl"
  | "el"
  | "hu"
  | "pl"
  | "cs"
  | "sv"
  | "fi";

type Messages = Record<string, string>;
export type MessageKey = keyof typeof en;

const baseMessages: Record<SupportedLanguage, Messages> = {
  en,
  fr,
  de,
  es,
  it,
  pt,
  "pt-BR": ptBR,
  nl,
  el,
  hu,
  pl,
  cs,
  sv,
  fi,
};

const enKeys = Object.keys(baseMessages.en);

function normalizeMessages(
  raw: Record<SupportedLanguage, Messages>,
): Record<SupportedLanguage, Messages> {
  const normalized = {} as Record<SupportedLanguage, Messages>;
  for (const lang of Object.keys(raw) as SupportedLanguage[]) {
    const bundle = raw[lang] ?? {};
    const next: Messages = {};
    for (const key of enKeys) {
      if (Object.prototype.hasOwnProperty.call(bundle, key)) {
        next[key] = bundle[key];
      } else {
        next[key] = raw.en[key];
      }
    }
    normalized[lang] = next;
  }
  return normalized;
}

export const messages = normalizeMessages(baseMessages);

export const supportedLanguages = Object.keys(baseMessages) as SupportedLanguage[];

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

export const templateNameLabels: Record<SupportedLanguage, Partial<Record<TemplateId, string>>> = {
  en: {
    hero: "Hero Card",
    monster: "Monster Card",
    "small-treasure": "Small Artwork",
    "large-treasure": "Large Artwork",
    "hero-back": "Hero Back",
    "labelled-back": "Labelled Back",
  },
  fr: {
    hero: "Carte Héros",
    monster: "Carte Monstre",
    "small-treasure": "Carte à petite illustration",
    "large-treasure": "Carte à grande illustration",
    "hero-back": "Dos de héros",
    "labelled-back": "Dos étiqueté",
  },
  de: {
    hero: "Heldenkarte",
    monster: "Monsterkarte",
    "small-treasure": "Karte mit kleinem Bild",
    "large-treasure": "Karte mit großem Bild",
    "hero-back": "Heldenrückseite",
    "labelled-back": "Beschriftete Rückseite",
  },
  es: {
    hero: "Carta de héroe",
    monster: "Carta de monstruo",
    "small-treasure": "Carta con arte pequeño",
    "large-treasure": "Carta con arte grande",
    "hero-back": "Reverso de héroe",
    "labelled-back": "Reverso con etiqueta",
  },
  it: {
    hero: "Carta eroe",
    monster: "Carta mostro",
    "small-treasure": "Carta con illustrazione piccola",
    "large-treasure": "Carta con illustrazione grande",
    "hero-back": "Retro eroe",
    "labelled-back": "Retro etichettato",
  },
  pt: {
    hero: "Carta de herói",
    monster: "Carta de monstro",
    "small-treasure": "Carta com arte pequena",
    "large-treasure": "Carta com arte grande",
    "hero-back": "Verso de herói",
    "labelled-back": "Verso com etiqueta",
  },
  "pt-BR": {
    hero: "Carta de herói",
    monster: "Carta de monstro",
    "small-treasure": "Arte pequena",
    "large-treasure": "Arte grande",
    "hero-back": "Verso do herói",
    "labelled-back": "Verso com rótulo",
  },
  nl: {
    hero: "Heldenkaart",
    monster: "Monsterkaart",
    "small-treasure": "Kaart met kleine illustratie",
    "large-treasure": "Kaart met grote illustratie",
    "hero-back": "Held achterkant",
    "labelled-back": "Gelabelde achterkant",
  },
  el: {
    hero: "Κάρτα ήρωα",
    monster: "Κάρτα τέρατος",
    "small-treasure": "Μικρή εικονογράφηση",
    "large-treasure": "Μεγάλη εικονογράφηση",
    "hero-back": "Πίσω όψη ήρωα",
    "labelled-back": "Πίσω όψη με ετικέτα",
  },
  hu: {
    hero: "Hőskártya",
    monster: "Szörnykártya",
    "small-treasure": "Kis illusztráció",
    "large-treasure": "Nagy illusztráció",
    "hero-back": "Hős hátoldal",
    "labelled-back": "Címkézett hátoldal",
  },
  pl: {
    hero: "Karta bohatera",
    monster: "Karta potwora",
    "small-treasure": "Mała ilustracja",
    "large-treasure": "Duża ilustracja",
    "hero-back": "Tył bohatera",
    "labelled-back": "Tył z etykietą",
  },
  cs: {
    hero: "Karta hrdiny",
    monster: "Karta příšery",
    "small-treasure": "Malá ilustrace",
    "large-treasure": "Velká ilustrace",
    "hero-back": "Rub hrdiny",
    "labelled-back": "Rub se štítkem",
  },
  sv: {
    hero: "Hjältekort",
    monster: "Monterkort",
    "small-treasure": "Liten illustration",
    "large-treasure": "Stor illustration",
    "hero-back": "Hjältebaksida",
    "labelled-back": "Baksida med etikett",
  },
  fi: {
    hero: "Sankarinkortti",
    monster: "Hirviökortti",
    "small-treasure": "Pieni kuvitus",
    "large-treasure": "Suuri kuvitus",
    "hero-back": "Sankarin kääntöpuoli",
    "labelled-back": "Merkitty kääntöpuoli",
  },
};
