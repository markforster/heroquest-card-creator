"use client";

import styles from "@/app/page.module.css";
import HelpModal from "@/components/HelpModal";
import ReleaseNotesModal from "@/components/ReleaseNotesModal";
import useIsTauriApp from "@/hooks/useIsTauriApp";
import { usePopupState } from "@/hooks/usePopupState";
import { useI18n } from "@/i18n/I18nProvider";
import { APP_VERSION } from "@/version";

export default function MainFooter() {
  const { t } = useI18n();
  const helpModal = usePopupState(false);
  const releaseNotesModal = usePopupState(false);
  const isTauriApp = useIsTauriApp();

  return (
    <>
      <footer className={styles.footer}>
        <div className="d-flex align-items-center w-100">
          <div className={styles.footerLeft}>
            <button
              type="button"
              className={styles.footerLink}
              onClick={helpModal.open}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {t("actions.help")}
            </button>
            <span>·</span>
            <button
              type="button"
              className={styles.footerLink}
              onClick={releaseNotesModal.open}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {t("actions.about")}
            </button>
            <span>·</span>
            <a
              href="https://public.markforster.info/Heroquest/Tools/heroquest-card-maker.zip"
              target="_blank"
              rel="noreferrer noopener"
              className={styles.footerLink}
            >
              {t("actions.download")}
            </a>
          </div>
          <div className="ms-auto d-flex align-items-center gap-1">
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
            >
              Mark Forster
            </a>
          </div>
        </div>
      </footer>
      <HelpModal isOpen={helpModal.isOpen} onClose={helpModal.close} />
      <ReleaseNotesModal isOpen={releaseNotesModal.isOpen} onClose={releaseNotesModal.close} />
    </>
  );
}
