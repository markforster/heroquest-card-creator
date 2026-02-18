"use client";

import { useCallback, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { useLibraryTransfer } from "@/components/Providers/LibraryTransferContext";

import HeaderBrand from "./HeaderBrand";
import HeaderMenu from "./HeaderMenu";

export default function MainHeader() {
  const { isBusy, isExporting, isImporting, openExport, openImport } = useLibraryTransfer();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <HeaderBrand />
      </div>
      <div className={styles.headerRight}>
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
