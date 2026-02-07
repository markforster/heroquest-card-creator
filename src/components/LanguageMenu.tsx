"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import { languageLabels, supportedLanguages } from "@/i18n/messages";

const languageFlags: Record<string, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇵🇹",
  nl: "🇳🇱",
};

type LanguageMenuProps = {
  isCollapsed: boolean;
};

export default function LanguageMenu({ isCollapsed }: LanguageMenuProps) {
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const currentFlag = languageFlags[language] ?? "🏳️";
  const currentCode = language.toUpperCase();
  const currentLabel = languageLabels[language] ?? currentCode;

  const options = useMemo(
    () =>
      supportedLanguages.map((code) => ({
        code,
        label: languageLabels[code] ?? code.toUpperCase(),
        flag: languageFlags[code] ?? "🏳️",
      })),
    []
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.leftNavMenu} ref={menuRef}>
      <button
        type="button"
        className={styles.leftNavMenuButton}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("aria.language")}
        aria-expanded={isOpen}
        title={currentLabel}
      >
        <span className={styles.leftNavMenuFlag} aria-hidden="true">
          {currentFlag}
        </span>
        {!isCollapsed ? (
          <span className={styles.leftNavMenuLabel}>{currentCode}</span>
        ) : null}
      </button>
      {isOpen ? (
        <div className={styles.leftNavMenuPopover} role="menu">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              className={styles.leftNavMenuItem}
              role="menuitem"
              onClick={() => {
                setLanguage(option.code);
                setIsOpen(false);
              }}
            >
              <span className={styles.leftNavMenuText}>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
