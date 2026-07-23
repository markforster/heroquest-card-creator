"use client";

import { Gamepad2, Lightbulb, TriangleAlert, Twitter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isMobile, isTablet } from "react-device-detect";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import { useMediaQuery } from "@/components/Layout/LeftNav/useMediaQuery";
import ReleaseNotesModal from "@/components/Modals/ReleaseNotesModal";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useFooterTip } from "@/components/Providers/FooterTipContext";
import useIsTauriApp from "@/hooks/useIsTauriApp";
import { usePopupState } from "@/hooks/usePopupState";
import { useI18n } from "@/i18n/I18nProvider";
import { attachItchBuyButton } from "@/lib/itch";
import { APP_VERSION } from "@/version";

import type { FooterTip } from "@/components/Providers/FooterTipContext";

const FOOTER_TIP_FADE_MS = 180;

function isSameFooterTip(left: FooterTip | null, right: FooterTip | null) {
  return (
    left?.source === right?.source &&
    left?.message === right?.message &&
    left?.icon === right?.icon
  );
}

function FooterTipIcon({ icon }: { icon?: "lightbulb" }) {
  if (icon === "lightbulb") {
    return <Lightbulb className={styles.footerTipIcon} aria-hidden="true" />;
  }
  return null;
}

export default function MainFooter() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const releaseNotesModal = usePopupState(false);
  const desktopNoticeModal = usePopupState(false);
  const isTauriApp = useIsTauriApp();
  const isNarrowViewport = useMediaQuery("(max-width: 1024px)");
  const { currentTip } = useFooterTip();
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerTipTimeoutRef = useRef<number | null>(null);
  const showDownloadLink = false;
  const showDesktopOptimizedNotice = isMobile || isTablet || isNarrowViewport;
  const [renderedTip, setRenderedTip] = useState<FooterTip | null>(currentTip);
  const [isRenderedTipVisible, setIsRenderedTipVisible] = useState(Boolean(currentTip));

  useEffect(() => {
    attachItchBuyButton(downloadLinkRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (footerTipTimeoutRef.current !== null) {
        window.clearTimeout(footerTipTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isSameFooterTip(renderedTip, currentTip)) {
      setIsRenderedTipVisible(Boolean(currentTip));
      return;
    }

    if (footerTipTimeoutRef.current !== null) {
      window.clearTimeout(footerTipTimeoutRef.current);
      footerTipTimeoutRef.current = null;
    }

    if (!renderedTip) {
      setRenderedTip(currentTip);
      setIsRenderedTipVisible(false);
      footerTipTimeoutRef.current = window.setTimeout(() => {
        setIsRenderedTipVisible(Boolean(currentTip));
        footerTipTimeoutRef.current = null;
      }, 0);
      return;
    }

    setIsRenderedTipVisible(false);
    footerTipTimeoutRef.current = window.setTimeout(() => {
      setRenderedTip(currentTip);
      footerTipTimeoutRef.current = window.setTimeout(() => {
        setIsRenderedTipVisible(Boolean(currentTip));
        footerTipTimeoutRef.current = null;
      }, 0);
    }, FOOTER_TIP_FADE_MS);
  }, [currentTip, renderedTip]);

  return (
    <>
      <footer className={`${styles.footer} d-flex align-items-center gap-2`}>
        <div className="d-flex align-items-center w-100">
          <div className={`${styles.footerLeft} d-flex align-items-center gap-1`}>
            <a
              href="https://markforster.github.io/heroquest-card-creator/help/"
              target="_blank"
              rel="noreferrer noopener"
              className={styles.footerLink}
              onClick={() => {
                track("page_view", { page_path: "/help", page_title: "Help" });
              }}
            >
              {t("actions.help")}
            </a>
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
            {showDownloadLink ? (
              <>
                <span>·</span>
                <a
                  ref={downloadLinkRef}
                  href="https://mark-forster.itch.io/heroquest-card-creator?source=footer-download"
                  className={styles.footerLink}
                  onClickCapture={(event) => {
                    event.preventDefault();
                    track("page_view", { page_path: "/download", page_title: "Download" });
                  }}
                >
                  {t("actions.download")}
                </a>
              </>
            ) : null}
          </div>
          <div className={styles.footerSpacer} aria-hidden="true" />
          <div
            className={`${styles.footerCenter} d-flex align-items-center justify-content-center`}
          >
            {renderedTip ? (
              <span
                className={`${styles.footerTipText} ${
                  isRenderedTipVisible ? styles.footerTipTextVisible : styles.footerTipTextHidden
                }`}
              >
                <FooterTipIcon icon={renderedTip.icon} />
                <span>{renderedTip.message}</span>
              </span>
            ) : showDesktopOptimizedNotice ? (
              <button
                type="button"
                className={styles.footerCompatibilityNotice}
                onClick={() => {
                  track("page_view", {
                    page_path: "/desktop-compatibility",
                    page_title: "Desktop Compatibility",
                  });
                  desktopNoticeModal.open();
                }}
                title={t("tooltip.desktopOptimizedNotice")}
              >
                <TriangleAlert
                  className={styles.footerCompatibilityNoticeIcon}
                  aria-hidden="true"
                />
                {t("label.desktopOptimized")}
              </button>
            ) : null}
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
      <ReleaseNotesModal isOpen={releaseNotesModal.isOpen} onClose={releaseNotesModal.close} />
      <ModalShell
        isOpen={desktopNoticeModal.isOpen}
        onClose={desktopNoticeModal.close}
        title={t("heading.desktopBrowserRecommended")}
        footer={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={desktopNoticeModal.close}
          >
            {t("actions.ok")}
          </button>
        }
      >
        <div className={styles.footerCompatibilityModalBody}>
          <p>{t("notice.desktopOptimizedBodyPrimary")}</p>
          <p>{t("notice.desktopOptimizedBodySecondary")}</p>
        </div>
      </ModalShell>
    </>
  );
}
