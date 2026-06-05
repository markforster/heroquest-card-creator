"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { getDetectedLanguage } from "@/i18n/getInitialLanguage";
import { useI18n } from "@/i18n/I18nProvider";
import { languageFlags } from "@/i18n/language-flags";
import {
  languageNameKeys,
  languageLabels,
  SupportedLanguage,
  visibleLanguages,
} from "@/i18n/messages";

import LanguageMenuButton from "./LanguageMenuButton";
import LanguageMenuPopover from "./LanguageMenuPopover";

type LanguageMenuProps = {
  isCollapsed: boolean;
};

type LanguageOption = {
  code: string;
  label: string;
  title: string;
  flag: string;
};

type LanguagePopoverSections = {
  primaryOptions: LanguageOption[];
  detectedOption: LanguageOption | null;
};

const getLanguageSortKey = (label: string): string => {
  const trimmed = label.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return trimmed;
  return trimmed.slice(firstSpace + 1).trim();
};

const getLanguageOptions = (
  getLocalizedLanguageName: (code: SupportedLanguage) => string,
): LanguageOption[] => {
  const options = visibleLanguages.map((code) => ({
    code,
    label: languageLabels[code] ?? code.toUpperCase(),
    title: getLocalizedLanguageName(code),
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
      setIsOpen(false);
    },
    [setLanguage],
  );

  useClickOutside(menuRef, handleClose);

  const currentFlag = languageFlags[language] ?? "🏳️";
  const currentCode = language.toUpperCase();
  const currentLabel = languageLabels[language] ?? currentCode;
  const getLocalizedLanguageName = useCallback(
    (code: SupportedLanguage) => t(languageNameKeys[code]),
    [t],
  );

  const popoverSections = useMemo<LanguagePopoverSections>(() => {
    const baseOptions = getLanguageOptions(getLocalizedLanguageName);
    const filteredOptions = baseOptions.filter((option) => option.code !== language);
    if (!detectedLanguage || detectedLanguage === language) {
      return {
        primaryOptions: filteredOptions,
        detectedOption: null,
      };
    }

    const detectedOption = filteredOptions.find((option) => option.code === detectedLanguage);
    if (!detectedOption) {
      return {
        primaryOptions: filteredOptions,
        detectedOption: null,
      };
    }

    return {
      primaryOptions: filteredOptions.filter((option) => option.code !== detectedLanguage),
      detectedOption,
    };
  }, [detectedLanguage, getLocalizedLanguageName, language]);

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
      <LanguageMenuPopover
        isOpen={isOpen}
        primaryOptions={popoverSections.primaryOptions}
        detectedOption={popoverSections.detectedOption}
        onSelect={handleSelect}
      />
    </div>
  );
}
