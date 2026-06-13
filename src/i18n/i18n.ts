/* istanbul ignore file */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { defaultNS, namespaces, resources } from "./resources";

let initialized = false;

export function ensureI18nInitialized() {
  if (initialized) return i18n;

  i18n.use(initReactI18next).init({
    resources,
    defaultNS,
    ns: namespaces,
    lng: "en",
    fallbackLng: false,
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
  });

  initialized = true;
  return i18n;
}

ensureI18nInitialized();

export default i18n;
