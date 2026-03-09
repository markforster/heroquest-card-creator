"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { getDetectedLanguage } from "@/i18n/getInitialLanguage";
import { useI18n } from "@/i18n/I18nProvider";
import { languageFlags } from "@/i18n/language-flags";
import {
  languageLabels,
  SupportedLanguage,
  supportedLanguages,
} from "@/i18n/messages";

import LanguageMenuButton from "./LanguageMenuButton";
import LanguageMenuPopover from "./LanguageMenuPopover";

type LanguageMenuProps = {
  isCollapsed: boolean;
};

type LanguageOption = {
  code: string;
  label: string;
  flag: string;
  isDetected?: boolean;
};

const getLanguageSortKey = (label: string): string => {
  const trimmed = label.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return trimmed;
  return trimmed.slice(firstSpace + 1).trim();
};

const getLanguageOptions = (): LanguageOption[] => {
  const options = supportedLanguages.map((code) => ({
    code,
    label: languageLabels[code] ?? code.toUpperCase(),
    flag: languageFlags[code] ?? "🏳️",
  }));

  return options.sort((a, b) =>
    getLanguageSortKey(a.label).localeCompare(getLanguageSortKey(b.label), undefined, {
      sensitivity: "base",
    }),
  );
};

export default function LanguageMenu({ isCollapsed }: LanguageMenuProps) {
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDetectedLanguage(getDetectedLanguage());
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (code: string) => {
      setLanguage(code as SupportedLanguage);
      setHasStoredLanguage(true);
      setIsOpen(false);
    },
    [setLanguage],
  );

  useClickOutside(menuRef, handleClose);

  const currentFlag = languageFlags[language] ?? "🏳️";
  const currentCode = language.toUpperCase();
  const currentLabel = languageLabels[language] ?? currentCode;

  const options = useMemo(() => {
    const baseOptions = getLanguageOptions();
    const filteredOptions = baseOptions.filter((option) => option.code !== language);
    if (!detectedLanguage || detectedLanguage === language) {
      return filteredOptions;
    }

    const detectedOption = filteredOptions.find((option) => option.code === detectedLanguage);
    if (!detectedOption) return filteredOptions;

    const remaining = filteredOptions.filter((option) => option.code !== detectedLanguage);

    return [...remaining, { ...detectedOption, isDetected: true }];
  }, [detectedLanguage, language]);

  return (
    <div className={styles.leftNavMenu} ref={menuRef}>
      <LanguageMenuButton
        currentFlag={currentFlag}
        currentCode={currentCode}
        currentLabel={currentLabel}
        isCollapsed={isCollapsed}
        isOpen={isOpen}
        onToggle={handleToggle}
        ariaLabel={t("aria.language")}
      />
      <LanguageMenuPopover isOpen={isOpen} options={options} onSelect={handleSelect} />
    </div>
  );
}
