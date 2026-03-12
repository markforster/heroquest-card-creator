"use client";

import { useEffect, useRef } from "react";
import { Gamepad2, Twitter } from "lucide-react";
import styles from "@/app/page.module.css";
import HelpModal from "@/components/Modals/HelpModal";
import ReleaseNotesModal from "@/components/Modals/ReleaseNotesModal";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import useIsTauriApp from "@/hooks/useIsTauriApp";
import { usePopupState } from "@/hooks/usePopupState";
import { useI18n } from "@/i18n/I18nProvider";
import { APP_VERSION } from "@/version";

export default function MainFooter() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const helpModal = usePopupState(false);
  const releaseNotesModal = usePopupState(false);
  const isTauriApp = useIsTauriApp();
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const link = downloadLinkRef.current;
    if (!link || typeof window === "undefined") return;
    const itch = (window as typeof window & { Itch?: { attachBuyButton?: (el: HTMLElement, opts: { user: string; game: string; width?: number; height?: number }) => void } }).Itch;
    if (!itch?.attachBuyButton) return;
    itch.attachBuyButton(link, { user: "mark-forster", game: "heroquest-card-creator", width: 650, height: 400 });
  }, []);

  return (
    <>
      <footer className={`${styles.footer} d-flex align-items-center gap-2`}>
        <div className="d-flex align-items-center w-100">
          <div className={`${styles.footerLeft} d-flex align-items-center gap-1`}>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => {
                track("page_view", { page_path: "/help", page_title: "Help" });
                helpModal.open();
              }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {t("actions.help")}
            </button>
            <span>·</span>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => {
                track("page_view", { page_path: "/about", page_title: "About" });
                releaseNotesModal.open();
              }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {t("actions.about")}
            </button>
            <span>·</span>
            <a
              ref={downloadLinkRef}
              href="#"
              className={styles.footerLink}
              onClickCapture={(event) => {
                event.preventDefault();
                track("page_view", { page_path: "/download", page_title: "Download" });
              }}
            >
              {t("actions.download")}
            </a>
          </div>
          <div className={styles.footerSpacer} aria-hidden="true" />
          <div
            className={`${styles.footerCenter} d-flex align-items-center justify-content-center`}
          >
            {/* <RateCta /> */}
          </div>
          <div className={styles.footerSpacer} aria-hidden="true" />
          <div className="d-flex align-items-center gap-1">
            <span>·</span>
            <a
              href={`https://github.com/markforster/heroquest-card-creator/releases/tag/v${APP_VERSION}`}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.footerLink}
              title={t("tooltip.appVersion")}
            >
              v {APP_VERSION}
            </a>
            <span>·</span>
            <span>App: {isTauriApp ? "Tauri" : "Web"}</span>
            <span>·</span>
            <span>{t("ui.madeWith")}</span>
            <span className={styles.footerHeart} aria-hidden="true">
              ♥
            </span>
            <span>{t("ui.by")}</span>
            <a
              href="https://markforster.info/"
              target="_blank"
              rel="noreferrer noopener"
              className={styles.footerLink}
              onClick={() => {
                track("page_view", { page_path: "/website", page_title: "markforster.info" });
              }}
            >
              Mark Forster
            </a>
            <div className={styles.footerSocialLinks} aria-label="Social links">
              <a
                href="https://x.com/markforster"
                target="_blank"
                rel="noreferrer noopener"
                className={styles.footerSocialLink}
                aria-label="Twitter"
              >
                <Twitter className={styles.footerSocialIcon} />
              </a>
              <a
                href="https://mark-forster.itch.io/"
                target="_blank"
                rel="noreferrer noopener"
                className={styles.footerSocialLink}
                aria-label="Itch.io"
              >
                <Gamepad2 className={styles.footerSocialIcon} />
              </a>
            </div>
          </div>
        </div>
      </footer>
      <HelpModal isOpen={helpModal.isOpen} onClose={helpModal.close} />
      <ReleaseNotesModal isOpen={releaseNotesModal.isOpen} onClose={releaseNotesModal.close} />
    </>
  );
}
