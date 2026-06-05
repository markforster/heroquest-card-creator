/* istanbul ignore file */
import cs_common from "./locales/cs/common.json";
import cs_decks from "./locales/cs/decks.json";
import cs_formattingHelp from "./locales/cs/formattingHelp.json";
import cs_templates from "./locales/cs/templates.json";
import da_common from "./locales/da/common.json";
import da_decks from "./locales/da/decks.json";
import da_formattingHelp from "./locales/da/formattingHelp.json";
import da_templates from "./locales/da/templates.json";
import de_common from "./locales/de/common.json";
import de_decks from "./locales/de/decks.json";
import de_formattingHelp from "./locales/de/formattingHelp.json";
import de_templates from "./locales/de/templates.json";
import el_common from "./locales/el/common.json";
import el_decks from "./locales/el/decks.json";
import el_formattingHelp from "./locales/el/formattingHelp.json";
import el_templates from "./locales/el/templates.json";
import en_common from "./locales/en/common.json";
import en_decks from "./locales/en/decks.json";
import en_formattingHelp from "./locales/en/formattingHelp.json";
import en_templates from "./locales/en/templates.json";
import es_common from "./locales/es/common.json";
import es_decks from "./locales/es/decks.json";
import es_formattingHelp from "./locales/es/formattingHelp.json";
import es_templates from "./locales/es/templates.json";
import fi_common from "./locales/fi/common.json";
import fi_decks from "./locales/fi/decks.json";
import fi_formattingHelp from "./locales/fi/formattingHelp.json";
import fi_templates from "./locales/fi/templates.json";
import fr_common from "./locales/fr/common.json";
import fr_decks from "./locales/fr/decks.json";
import fr_formattingHelp from "./locales/fr/formattingHelp.json";
import fr_templates from "./locales/fr/templates.json";
import hu_common from "./locales/hu/common.json";
import hu_decks from "./locales/hu/decks.json";
import hu_formattingHelp from "./locales/hu/formattingHelp.json";
import hu_templates from "./locales/hu/templates.json";
import it_common from "./locales/it/common.json";
import it_decks from "./locales/it/decks.json";
import it_formattingHelp from "./locales/it/formattingHelp.json";
import it_templates from "./locales/it/templates.json";
import nb_common from "./locales/nb/common.json";
import nb_decks from "./locales/nb/decks.json";
import nb_formattingHelp from "./locales/nb/formattingHelp.json";
import nb_templates from "./locales/nb/templates.json";
import nl_common from "./locales/nl/common.json";
import nl_decks from "./locales/nl/decks.json";
import nl_formattingHelp from "./locales/nl/formattingHelp.json";
import nl_templates from "./locales/nl/templates.json";
import pl_common from "./locales/pl/common.json";
import pl_decks from "./locales/pl/decks.json";
import pl_formattingHelp from "./locales/pl/formattingHelp.json";
import pl_templates from "./locales/pl/templates.json";
import pt_common from "./locales/pt/common.json";
import pt_decks from "./locales/pt/decks.json";
import pt_formattingHelp from "./locales/pt/formattingHelp.json";
import pt_templates from "./locales/pt/templates.json";
import pt_BR_common from "./locales/pt-BR/common.json";
import pt_BR_decks from "./locales/pt-BR/decks.json";
import pt_BR_formattingHelp from "./locales/pt-BR/formattingHelp.json";
import pt_BR_templates from "./locales/pt-BR/templates.json";
import ru_common from "./locales/ru/common.json";
import ru_decks from "./locales/ru/decks.json";
import ru_formattingHelp from "./locales/ru/formattingHelp.json";
import ru_templates from "./locales/ru/templates.json";
import sv_common from "./locales/sv/common.json";
import sv_decks from "./locales/sv/decks.json";
import sv_formattingHelp from "./locales/sv/formattingHelp.json";
import sv_templates from "./locales/sv/templates.json";

export const defaultNS = "common" as const;
export const namespaces = ["common", "decks", "formattingHelp", "templates"] as const;
export type Namespace = (typeof namespaces)[number];

export const resources = {
  en: {
    common: en_common,
    decks: en_decks,
    formattingHelp: en_formattingHelp,
    templates: en_templates,
  },
  fr: {
    common: fr_common,
    decks: fr_decks,
    formattingHelp: fr_formattingHelp,
    templates: fr_templates,
  },
  de: {
    common: de_common,
    decks: de_decks,
    formattingHelp: de_formattingHelp,
    templates: de_templates,
  },
  da: {
    common: da_common,
    decks: da_decks,
    formattingHelp: da_formattingHelp,
    templates: da_templates,
  },
  es: {
    common: es_common,
    decks: es_decks,
    formattingHelp: es_formattingHelp,
    templates: es_templates,
  },
  it: {
    common: it_common,
    decks: it_decks,
    formattingHelp: it_formattingHelp,
    templates: it_templates,
  },
  nb: {
    common: nb_common,
    decks: nb_decks,
    formattingHelp: nb_formattingHelp,
    templates: nb_templates,
  },
  pt: {
    common: pt_common,
    decks: pt_decks,
    formattingHelp: pt_formattingHelp,
    templates: pt_templates,
  },
  "pt-BR": {
    common: pt_BR_common,
    decks: pt_BR_decks,
    formattingHelp: pt_BR_formattingHelp,
    templates: pt_BR_templates,
  },
  ru: {
    common: ru_common,
    decks: ru_decks,
    formattingHelp: ru_formattingHelp,
    templates: ru_templates,
  },
  nl: {
    common: nl_common,
    decks: nl_decks,
    formattingHelp: nl_formattingHelp,
    templates: nl_templates,
  },
  el: {
    common: el_common,
    decks: el_decks,
    formattingHelp: el_formattingHelp,
    templates: el_templates,
  },
  hu: {
    common: hu_common,
    decks: hu_decks,
    formattingHelp: hu_formattingHelp,
    templates: hu_templates,
  },
  pl: {
    common: pl_common,
    decks: pl_decks,
    formattingHelp: pl_formattingHelp,
    templates: pl_templates,
  },
  cs: {
    common: cs_common,
    decks: cs_decks,
    formattingHelp: cs_formattingHelp,
    templates: cs_templates,
  },
  sv: {
    common: sv_common,
    decks: sv_decks,
    formattingHelp: sv_formattingHelp,
    templates: sv_templates,
  },
  fi: {
    common: fi_common,
    decks: fi_decks,
    formattingHelp: fi_formattingHelp,
    templates: fi_templates,
  },
} as const;

export function namespaceForMessageKey(key: string): Namespace {
  if (key.startsWith("decks.")) return "decks";
  if (key.startsWith("formattingHelp.")) return "formattingHelp";
  if (key.startsWith("templates.")) return "templates";
  return "common";
}
