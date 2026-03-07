"use client";

import { Download, Menu, Monitor, Moon, Sun, Upload } from "lucide-react";

import styles from "@/app/page.module.css";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useTheme } from "@/components/Providers/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";

import type { RefObject } from "react";

type HeaderMenuProps = {
  isMenuOpen: boolean;
  isBusy: boolean;
  isExporting: boolean;
  isImporting: boolean;
  onToggle: () => void;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  menuRef: RefObject<HTMLDivElement>;
};

export default function HeaderMenu({
  isMenuOpen,
  isBusy,
  isExporting,
  isImporting,
  onToggle,
  onClose,
  onExport,
  onImport,
  menuRef,
}: HeaderMenuProps) {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const { preference, setPreference } = useTheme();

  return (
    <div className={styles.headerMenu} ref={menuRef}>
      <button
        type="button"
        className={styles.headerMenuButton}
        onClick={onToggle}
        aria-label={t("aria.libraryMenu")}
        aria-expanded={isMenuOpen}
      >
        <Menu className={styles.icon} aria-hidden="true" />
      </button>
      {isMenuOpen ? (
        <div className={styles.headerMenuPopover} role="menu">
          <button
            type="button"
            className={styles.headerMenuItem}
            onClick={() => {
              onClose();
              track("page_view", { page_path: "/export", page_title: "Export" });
              onExport();
            }}
            disabled={isBusy}
            title={t("tooltip.exportBackup")}
            role="menuitem"
          >
            <Download className={styles.headerMenuItemIcon} aria-hidden="true" />
            {isExporting ? t("actions.exporting") : t("actions.exportLibrary")}
          </button>
          <button
            type="button"
            className={styles.headerMenuItem}
            onClick={() => {
              onClose();
              track("page_view", { page_path: "/import", page_title: "Import" });
              onImport();
            }}
            disabled={isBusy}
            title={t("tooltip.importBackup")}
            role="menuitem"
          >
            <Upload className={styles.headerMenuItemIcon} aria-hidden="true" />
            {isImporting ? t("actions.importing") : t("actions.importLibrary")}
          </button>
          <div className={styles.headerMenuDivider} />
          <div className={styles.headerThemeToggle} role="group" aria-label={t("label.theme")}>
            <button
              type="button"
              className={`${styles.headerThemeToggleButton} ${
                preference === "light" ? styles.headerThemeToggleButtonActive : ""
              }`}
              onClick={() => setPreference("light")}
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
              onClick={() => setPreference("dark")}
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
              onClick={() => setPreference("system")}
              aria-label={t("label.useSystemTheme")}
              aria-pressed={preference === "system"}
            >
              <Monitor className={styles.headerThemeToggleIcon} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
