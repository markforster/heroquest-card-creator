"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Monitor,
  Moon,
  Settings,
  Sun,
  Upload,
} from "lucide-react";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useLibraryTransfer } from "@/components/Providers/LibraryTransferContext";
import { useTheme } from "@/components/Providers/ThemeProvider";
import { getDetectedLanguage } from "@/i18n/getInitialLanguage";
import { useI18n } from "@/i18n/I18nProvider";
import { languageFlags } from "@/i18n/language-flags";
import {
  languageLabels,
  SupportedLanguage,
  supportedLanguages,
} from "@/i18n/messages";

import LanguageMenuPopover from "@/components/LanguageMenu/LanguageMenuPopover";

import type { ComponentType } from "react";

type LeftNavActionStripProps = {
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

function ThemeIcon({ preference }: { preference: "dark" | "light" | "system" }) {
  const iconMap: Record<string, ComponentType<{ className?: string }>> = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };
  const Icon = iconMap[preference] ?? Monitor;
  return <Icon className={styles.leftNavStripIcon} aria-hidden="true" />;
}

export default function LeftNavActionStrip({ isCollapsed }: LeftNavActionStripProps) {
  const { t, language, setLanguage } = useI18n();
  const { track } = useAnalytics();
  const { preference, setPreference } = useTheme();
  const { openSettings, isSettingsOpen } = useAppActions();
  const { isBusy, isExporting, isImporting, openExport, openImport } = useLibraryTransfer();

  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage | null>(null);

  const languageRef = useRef<HTMLDivElement | null>(null);
  const themeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDetectedLanguage(getDetectedLanguage());
  }, []);

  useClickOutside(languageRef, () => setIsLanguageOpen(false));
  useClickOutside(themeRef, () => setIsThemeOpen(false));

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

  const handleLanguageSelect = useCallback(
    (code: string) => {
      setLanguage(code as SupportedLanguage);
      setIsLanguageOpen(false);
    },
    [setLanguage],
  );

  const handleOpenLanguage = useCallback(() => {
    setIsThemeOpen(false);
    setIsLanguageOpen((prev) => !prev);
  }, []);

  const handleOpenTheme = useCallback(() => {
    setIsLanguageOpen(false);
    setIsThemeOpen((prev) => !prev);
  }, []);

  return (
    <div
      className={`${styles.leftNavActionStrip} ${
        isCollapsed ? styles.leftNavActionStripCollapsed : ""
      }`}
    >
      <div className={styles.leftNavStripItem} ref={languageRef}>
        <button
          type="button"
          className={styles.leftNavStripButton}
          onClick={handleOpenLanguage}
          aria-label={t("aria.language")}
          aria-expanded={isLanguageOpen}
          title={currentLabel}
        >
          <span className={styles.leftNavStripFlag} aria-hidden="true">
            {currentFlag}
          </span>
        </button>
        <LanguageMenuPopover
          isOpen={isLanguageOpen}
          options={options}
          onSelect={handleLanguageSelect}
        />
      </div>

      <button
        type="button"
        className={styles.leftNavStripButton}
        onClick={() => {
          track("page_view", { page_path: "/export", page_title: "Export" });
          openExport();
        }}
        aria-label={t("actions.exportLibrary")}
        title={isExporting ? t("actions.exporting") : t("tooltip.exportBackup")}
        disabled={isBusy}
      >
        <Download className={styles.leftNavStripIcon} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={styles.leftNavStripButton}
        onClick={() => {
          track("page_view", { page_path: "/import", page_title: "Import" });
          openImport();
        }}
        aria-label={t("actions.importLibrary")}
        title={isImporting ? t("actions.importing") : t("tooltip.importBackup")}
        disabled={isBusy}
      >
        <Upload className={styles.leftNavStripIcon} aria-hidden="true" />
      </button>

      <div className={styles.leftNavStripItem} ref={themeRef}>
        <button
          type="button"
          className={styles.leftNavStripButton}
          onClick={handleOpenTheme}
          aria-label={t("label.theme")}
          aria-expanded={isThemeOpen}
          title={t("label.theme")}
        >
          <ThemeIcon preference={preference} />
        </button>
        {isThemeOpen ? (
          <div className={styles.leftNavStripPopover} role="menu">
            <div className={styles.headerThemeToggle} role="group" aria-label={t("label.theme")}>
              <button
                type="button"
                className={`${styles.headerThemeToggleButton} ${
                  preference === "light" ? styles.headerThemeToggleButtonActive : ""
                }`}
                onClick={() => {
                  setPreference("light");
                  setIsThemeOpen(false);
                }}
                aria-label={t("label.themeLight")}
                aria-pressed={preference === "light"}
              >
                <Sun className={styles.headerThemeToggleIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.headerThemeToggleButton} ${
                  preference === "dark" ? styles.headerThemeToggleButtonActive : ""
                }`}
                onClick={() => {
                  setPreference("dark");
                  setIsThemeOpen(false);
                }}
                aria-label={t("label.themeDark")}
                aria-pressed={preference === "dark"}
              >
                <Moon className={styles.headerThemeToggleIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.headerThemeToggleButton} ${
                  preference === "system" ? styles.headerThemeToggleButtonActive : ""
                }`}
                onClick={() => {
                  setPreference("system");
                  setIsThemeOpen(false);
                }}
                aria-label={t("label.useSystemTheme")}
                aria-pressed={preference === "system"}
              >
                <Monitor className={styles.headerThemeToggleIcon} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`${styles.leftNavStripButton} ${
          isSettingsOpen ? styles.leftNavStripButtonActive : ""
        }`}
        onClick={() => {
          track("page_view", { page_path: "/settings", page_title: "Settings" });
          openSettings();
        }}
        aria-label={t("actions.settings")}
        title={t("tooltip.openSettings")}
      >
        <Settings className={styles.leftNavStripIcon} aria-hidden="true" />
      </button>
    </div>
  );
}
