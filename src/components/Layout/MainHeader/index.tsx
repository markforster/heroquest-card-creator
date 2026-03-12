"use client";

import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Facebook, MessageCircle, Twitter, UsersRound } from "lucide-react";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { useLibraryTransfer } from "@/components/Providers/LibraryTransferContext";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import { useI18n } from "@/i18n/I18nProvider";
import RateCta from "@/components/Layout/RateCta";

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
    <header className={`${styles.header} d-flex align-items-center`}>
      <div className={`${styles.headerLeft} d-flex flex-column`}>
        <HeaderBrand />
      </div>
      <div className={styles.headerSpacer} aria-hidden="true" />
      <div className={`${styles.headerCenter} d-flex align-items-center justify-content-center`}>
        <RateCta />
      </div>
      <div className={styles.headerSpacer} aria-hidden="true" />
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
        <div className={styles.headerSocialLinks} aria-label="Social links">
          <a
            href="https://x.com/hqcardcreator"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.headerSocialLink}
            aria-label="Twitter"
            title={t("tooltip.socialTwitter")}
          >
            <Twitter className={styles.headerSocialIcon} />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61585886908868"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.headerSocialLink}
            aria-label="Facebook"
            title={t("tooltip.socialFacebook")}
          >
            <Facebook className={styles.headerSocialIcon} />
          </a>
          <a
            href="https://mark-forster.itch.io/heroquest-search-tracker/community"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.headerSocialLink}
            aria-label="Community"
            title={t("tooltip.socialCommunity")}
          >
            <UsersRound className={styles.headerSocialIcon} />
          </a>
          <a
            href="https://discord.gg/gkVPyRjJ95"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.headerSocialLink}
            aria-label="Discord"
            title={t("tooltip.socialDiscord")}
          >
            <MessageCircle className={styles.headerSocialIcon} />
          </a>
        </div>
      </div>
    </header>
  );
}
