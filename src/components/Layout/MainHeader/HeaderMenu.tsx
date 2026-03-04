"use client";

import { Download, Menu, Upload } from "lucide-react";

import styles from "@/app/page.module.css";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
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
        </div>
      ) : null}
    </div>
  );
}
