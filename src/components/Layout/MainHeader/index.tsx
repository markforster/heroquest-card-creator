"use client";

import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Coffee, Facebook, MessageCircle, Twitter, UsersRound } from "lucide-react";

import styles from "@/app/page.module.css";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import { useI18n } from "@/i18n/I18nProvider";
import RateCta from "@/components/Layout/RateCta";

import HeaderBrand from "./HeaderBrand";

type MainHeaderProps = {
  missingAssetsCount?: number;
  showMissingAssetsReminder?: boolean;
};

export default function MainHeader({
  missingAssetsCount = 0,
  showMissingAssetsReminder = false,
}: MainHeaderProps) {
  const { t } = useI18n();
  const formatMessageWith = useCallback(
    (key: string, vars: Record<string, string | number>) => formatMessage(t(key as never), vars),
    [t],
  );

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
            href="https://mark-forster.itch.io/heroquest-card-creator/community"
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
          <a
            href="https://buymeacoffee.com/markforster"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.headerSocialLink}
            aria-label="Buy me a coffee"
            title={t("tooltip.socialBuyCoffee")}
          >
            <Coffee className={styles.headerSocialIcon} />
          </a>
        </div>
      </div>
    </header>
  );
}
