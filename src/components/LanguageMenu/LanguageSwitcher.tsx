"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { languageLabels, visibleLanguages } from "@/i18n/messages";

type LanguageSwitcherProps = {
  className?: string;
};

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <select
      aria-label={t("aria.language")}
      className={className}
      value={language}
      onChange={(event) => {
        setLanguage(event.target.value as typeof language);
        event.currentTarget.blur();
      }}
    >
      {visibleLanguages.map((code) => (
        <option key={code} value={code}>
          {languageLabels[code] ?? code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
