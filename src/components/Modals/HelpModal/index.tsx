"use client";

import { BookOpen, ExternalLink, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";
import type { OpenCloseProps } from "@/types/ui";

import BundledHelpContent from "./BundledHelpContent";
import { HELP_SITE_URL } from "./help-site-availability";
import OnlineHelpFrame from "./OnlineHelpFrame";
import useHelpSiteAvailability from "./useHelpSiteAvailability";

type HelpModalProps = OpenCloseProps;

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useI18n();
  const { availability, retry } = useHelpSiteAvailability(isOpen);
  const [useBundledHelp, setUseBundledHelp] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUseBundledHelp(false);
    }
  }, [isOpen]);

  const showOnlineHelp = availability === "available" && !useBundledHelp;
  const showChecking = availability === "checking" && !useBundledHelp;
  const showBundledHelp = !showOnlineHelp && !showChecking;

  const headerActions =
    availability === "available" ? (
      <>
        <button
          type="button"
          className={styles.helpHeaderAction}
          onClick={() => setUseBundledHelp((current) => !current)}
        >
          {useBundledHelp ? "View online help" : "Use built-in help"}
        </button>
        <a
          className={styles.helpHeaderAction}
          href={HELP_SITE_URL}
          target="_blank"
          rel="noreferrer noopener"
        >
          <ExternalLink aria-hidden="true" />
          <span>Open in new tab</span>
        </a>
      </>
    ) : availability === "unavailable" ? (
      <button type="button" className={styles.helpHeaderAction} onClick={() => void retry()}>
        <RefreshCw aria-hidden="true" />
        <span>Retry online help</span>
      </button>
    ) : null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.help")}
      contentClassName={styles.helpPopover}
      headerActions={headerActions}
    >
      {showChecking ? (
        <div className={styles.helpStatus} role="status">
          <span className={styles.helpLoadingIndicator} aria-hidden="true" />
          <span>Loading online help...</span>
        </div>
      ) : null}
      {showOnlineHelp ? <OnlineHelpFrame /> : null}
      {showBundledHelp ? (
        <div className={styles.helpBundledContent}>
          <div className={styles.helpOfflineNotice}>
            {availability === "available" ? (
              <>
                <BookOpen aria-hidden="true" />
                <span>Using the built-in guide. Online help remains available.</span>
              </>
            ) : (
              <>
                <WifiOff aria-hidden="true" />
                <span>
                  Online help is unavailable. You can still use the built-in guide included with the
                  app.
                </span>
              </>
            )}
          </div>
          <BundledHelpContent />
        </div>
      ) : null}
    </ModalShell>
  );
}
