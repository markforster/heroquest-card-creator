"use client";

import { useEffect, useRef, useState } from "react";

import { Download, Menu, Upload } from "lucide-react";
import Image from "next/image";

import styles from "@/app/page.module.css";
import { useLibraryTransfer } from "@/components/LibraryTransferContext";
import { useI18n } from "@/i18n/I18nProvider";

import appLogo from "../../public/assets/apple-touch-icon.png";

export default function MainHeader() {
  const { t } = useI18n();
  const { isBusy, isExporting, isImporting, openExport, openImport } = useLibraryTransfer();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerTitleRow}>
          <Image
            src={appLogo}
            alt={t("app.title")}
            className={styles.headerLogo}
            width={32}
            height={32}
            priority
          />
          <span>{t("app.title")}</span>
        </div>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.headerMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.headerMenuButton}
            onClick={() => setIsMenuOpen((prev) => !prev)}
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
                  setIsMenuOpen(false);
                  openExport();
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
                  setIsMenuOpen(false);
                  openImport();
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
      </div>
    </header>
  );
}
