"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { languageLabels, supportedLanguages } from "@/i18n/messages";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <select
      aria-label="Language"
      value={language}
      onChange={(event) => setLanguage(event.target.value as typeof language)}
    >
      {supportedLanguages.map((code) => (
        <option key={code} value={code}>
          {languageLabels[code] ?? code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
