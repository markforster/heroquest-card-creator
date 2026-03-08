"use client";

import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { useLibraryTransfer } from "@/components/Providers/LibraryTransferContext";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import { useI18n } from "@/i18n/I18nProvider";

import HeaderBrand from "./HeaderBrand";
import HeaderMenu from "./HeaderMenu";

type MainHeaderProps = {
  missingAssetsCount?: number;
  showMissingAssetsReminder?: boolean;
};

export default function MainHeader({
  missingAssetsCount = 0,
  showMissingAssetsReminder = false,
}: MainHeaderProps) {
  const { isBusy, isExporting, isImporting, openExport, openImport } = useLibraryTransfer();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();
  const formatMessageWith = useCallback(
    (key: string, vars: Record<string, string | number>) =>
      formatMessage(t(key as never), vars),
    [t],
  );

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleToggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleExport = useCallback(() => {
    openExport();
  }, [openExport]);

  const handleImport = useCallback(() => {
    openImport();
  }, [openImport]);

  useClickOutside(menuRef, handleCloseMenu);

  return (
    <header className={`${styles.header} d-flex align-items-center justify-content-between`}>
      <div className={`${styles.headerLeft} d-flex flex-column`}>
        <HeaderBrand />
      </div>
      <div className={`${styles.headerRight} d-flex align-items-center gap-2`}>
        {showMissingAssetsReminder ? (
          <div className={styles.missingAssetsHeaderToast} role="status">
            <Link className={styles.missingAssetsHeaderToastLink} to="/cards?missingartwork">
              {formatMessageWith("warning.missingArtworkDetectedHeader", {
                count: missingAssetsCount,
              })}
            </Link>
          </div>
        ) : null}
        <HeaderMenu
          isMenuOpen={isMenuOpen}
          isBusy={isBusy}
          isExporting={isExporting}
          isImporting={isImporting}
          onToggle={handleToggleMenu}
          onClose={handleCloseMenu}
          onExport={handleExport}
          onImport={handleImport}
          menuRef={menuRef}
        />
      </div>
    </header>
  );
}
