"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { useI18n } from "@/i18n/I18nProvider";
import { languageFlags } from "@/i18n/language-flags";
import { languageLabels, SupportedLanguage, supportedLanguages } from "@/i18n/messages";

import LanguageMenuButton from "./LanguageMenuButton";
import LanguageMenuPopover from "./LanguageMenuPopover";

type LanguageMenuProps = {
  isCollapsed: boolean;
};

type LanguageOption = {
  code: string;
  label: string;
  flag: string;
};

const getLanguageOptions = (): LanguageOption[] =>
  supportedLanguages.map((code) => ({
    code,
    label: languageLabels[code] ?? code.toUpperCase(),
    flag: languageFlags[code] ?? "🏳️",
  }));

export default function LanguageMenu({ isCollapsed }: LanguageMenuProps) {
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const options = useMemo(getLanguageOptions, []);

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
