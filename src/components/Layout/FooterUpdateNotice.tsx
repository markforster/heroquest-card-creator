"use client";

import { useEffect, useRef } from "react";

import styles from "@/app/page.module.css";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useUpdateNotice } from "@/components/Providers/UpdateNoticeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { HQCC_ITCH_DOWNLOAD_URL, attachItchBuyButton } from "@/lib/itch";
import { HQCC_NPM_PACKAGE_URL } from "@/lib/update-check/constants";

export default function FooterUpdateNotice() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const { distribution, isUpdateAvailable, latestVersion } = useUpdateNotice();
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    attachItchBuyButton(downloadLinkRef.current);
  }, []);

  if (!isUpdateAvailable || !latestVersion) {
    return null;
  }

  return (
    <div className={styles.footerUpdateNotice} role="status" aria-live="polite">
      <span className={styles.footerUpdateNoticeText}>
        {t("notice.updateAvailable", { version: latestVersion })}
      </span>
      <div className={styles.footerUpdateActions}>
        <a
          ref={downloadLinkRef}
          href={HQCC_ITCH_DOWNLOAD_URL}
          className={styles.footerUpdateActionPrimary}
          onClickCapture={(event) => {
            event.preventDefault();
            track("page_view", { page_path: "/download", page_title: "Download" });
          }}
        >
          {t("actions.downloadOnItch")}
        </a>
        {distribution === "npm" ? (
          <a
            href={HQCC_NPM_PACKAGE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.footerUpdateActionSecondary}
            onClick={() => {
              track("page_view", { page_path: "/npm-package", page_title: "npm Package" });
            }}
          >
            {t("actions.viewOnNpm")}
          </a>
        ) : null}
      </div>
    </div>
  );
}
