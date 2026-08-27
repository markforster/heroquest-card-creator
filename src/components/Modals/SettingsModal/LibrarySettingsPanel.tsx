"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  RotateCcw,
  SquareStack,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { readApiConfig } from "@/api/config";
import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import ModalShell from "@/components/common/ModalShell";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useLibraryTransfer } from "@/components/Providers/LibraryTransferContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";
import { invalidateCardThumbnail } from "@/lib/card-thumbnail-cache";
import {
  getLibraryResetSummary,
  resetLibraryData,
  type LibraryResetSummary,
} from "@/lib/data/library-reset";

import type { LucideIcon } from "lucide-react";

type ResetModalState = "closed" | "confirm" | "complete";
const SUMMARY_ROWS: Array<{
  key: keyof Pick<LibraryResetSummary, "cards" | "decks" | "assets">;
  labelKey: MessageKey;
  Icon: LucideIcon;
}> = [
  { key: "cards", labelKey: "label.cards", Icon: SquareStack },
  { key: "decks", labelKey: "actions.decks", Icon: Layers },
  { key: "assets", labelKey: "label.assets", Icon: ImageIcon },
];

const STORAGE_HELP_LINKS: Array<{ labelKey: MessageKey; href: string }> = [
  {
    labelKey: "label.storagePersistenceChromeHelp",
    href: "https://support.google.com/chrome/answer/14114868?hl=en",
  },
  {
    labelKey: "label.storagePersistenceEdgeHelp",
    href: "https://support.microsoft.com/en-US/edge/temporarily-allow-cookies-and-site-data-in-microsoft-edge",
  },
  {
    labelKey: "label.storagePersistenceSafariHelp",
    href: "https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac",
  },
  {
    labelKey: "label.storagePersistenceFirefoxHelp",
    href: "https://support.mozilla.org/en-US/kb/storage",
  },
];

export default function LibrarySettingsPanel() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { openImport, startExport } = useLibraryTransfer();
  const { resetActiveCards } = useCardEditor();
  const [summary, setSummary] = useState<LibraryResetSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetModalState, setResetModalState] = useState<ResetModalState>("closed");
  const [hasAcknowledgedReset, setHasAcknowledgedReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isRemoteMode = useMemo(() => {
    try {
      return readApiConfig().mode === "remote";
    } catch {
      return false;
    }
  }, []);

  const loadSummary = useCallback(async () => {
    if (isRemoteMode) {
      setSummary(null);
      setIsLoadingSummary(false);
      return;
    }

    setIsLoadingSummary(true);
    setErrorMessage(null);
    try {
      setSummary(await getLibraryResetSummary());
    } catch {
      setErrorMessage(t("alert.librarySummaryFailed"));
    } finally {
      setIsLoadingSummary(false);
    }
  }, [isRemoteMode, t]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleOpenReset = () => {
    setHasAcknowledgedReset(false);
    setErrorMessage(null);
    setResetModalState("confirm");
  };

  const refreshAppStateAfterReset = () => {
    invalidateCardThumbnail();
    queryClient.clear();
    resetActiveCards();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
      window.dispatchEvent(new CustomEvent("hqcc-assets-updated"));
    }
  };

  const handleConfirmReset = async () => {
    if (!hasAcknowledgedReset || isResetting) {
      return;
    }

    setIsResetting(true);
    setErrorMessage(null);
    try {
      await resetLibraryData();
      refreshAppStateAfterReset();
      setSummary(await getLibraryResetSummary());
      setResetModalState("complete");
    } catch {
      setErrorMessage(t("alert.libraryResetFailed"));
    } finally {
      setIsResetting(false);
    }
  };

  const isLibraryEmpty = summary?.isEmpty ?? true;
  const libraryActions = isRemoteMode ? (
    <>
      <button
        type="button"
        className={`btn btn-outline-light btn-sm ${styles.settingsPanelActionButton}`}
        onClick={startExport}
      >
        <span className={styles.settingsPanelActionIcon}>
          <Download size={16} aria-hidden="true" />
        </span>
        <span className={styles.settingsPanelActionLabel}>{t("actions.libraryPanelExport")}</span>
      </button>
      <button
        type="button"
        className={`btn btn-outline-light btn-sm ${styles.settingsPanelActionButton}`}
        onClick={openImport}
      >
        <span className={styles.settingsPanelActionIcon}>
          <Upload size={16} aria-hidden="true" />
        </span>
        <span className={styles.settingsPanelActionLabel}>{t("actions.libraryPanelImport")}</span>
      </button>
    </>
  ) : summary ? (
    <>
      <button
        type="button"
        className={`btn btn-outline-light btn-sm ${styles.settingsPanelActionButton}`}
        onClick={startExport}
      >
        <span className={styles.settingsPanelActionIcon}>
          <Download size={16} aria-hidden="true" />
        </span>
        <span className={styles.settingsPanelActionLabel}>{t("actions.libraryPanelExport")}</span>
      </button>
      <button
        type="button"
        className={`btn btn-outline-light btn-sm ${styles.settingsPanelActionButton}`}
        onClick={openImport}
      >
        <span className={styles.settingsPanelActionIcon}>
          <Upload size={16} aria-hidden="true" />
        </span>
        <span className={styles.settingsPanelActionLabel}>{t("actions.libraryPanelImport")}</span>
      </button>
      <button
        type="button"
        className={`btn btn-outline-danger btn-sm ${styles.settingsPanelActionButton}`}
        onClick={handleOpenReset}
        disabled={isLibraryEmpty || isLoadingSummary}
      >
        <span className={styles.settingsPanelActionIcon}>
          <RotateCcw size={16} aria-hidden="true" />
        </span>
        <span className={styles.settingsPanelActionLabel}>{t("actions.libraryPanelNew")}</span>
      </button>
    </>
  ) : null;

  return (
    <div className={`${styles.settingsPanelBody} ${styles.settingsPanelBodyNoScroll}`}>
      <div className={styles.librarySettingsScroll}>
        <div className={styles.librarySettingsContent}>
          <SettingsGroup title={t("heading.librarySettings")} className="d-flex flex-column gap-3">
            <div className={styles.settingsPanelRow}>{t("label.librarySettingsDescription")}</div>
            {isRemoteMode ? (
              <div className={styles.settingsPanelRow}>
                {t("label.libraryResetRemoteUnavailable")}
              </div>
            ) : null}
            {!isRemoteMode && isLoadingSummary ? (
              <div className={styles.settingsPanelRow}>{t("status.loading")}</div>
            ) : null}
            {!isRemoteMode && errorMessage ? (
              <div className={styles.libraryResetError} role="alert">
                {errorMessage}
              </div>
            ) : null}
            {!isRemoteMode && summary ? (
              <>
                <div className={styles.librarySummaryGrid} aria-label={t("label.librarySummary")}>
                  {SUMMARY_ROWS.map((row) => (
                    <div key={row.key} className={styles.librarySummaryItem}>
                      <div className={styles.librarySummaryIconWrap}>
                        <row.Icon className={styles.librarySummaryIcon} aria-hidden="true" />
                      </div>
                      <div className={styles.librarySummaryMeta}>
                        <span className={styles.librarySummaryLabel}>{t(row.labelKey)}</span>
                        <span className={styles.librarySummaryValue}>{summary[row.key]}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {summary.isEmpty ? (
                  <div className={styles.settingsPanelRow}>{t("label.libraryAlreadyEmpty")}</div>
                ) : null}
                <div className={styles.storagePersistenceRow}>
                  <p className={styles.storagePersistenceIntro}>
                    {t("label.storagePersistenceIntro")}
                  </p>
                  <div className={styles.storagePersistenceLinks}>
                    <span className={styles.storagePersistenceLead}>
                      {t("label.storagePersistenceBrowserHelp")}
                    </span>
                    {STORAGE_HELP_LINKS.map((link) => (
                      <a
                        key={link.href}
                        className={styles.storagePersistenceLink}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{t(link.labelKey)}</span>
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </SettingsGroup>
        </div>
      </div>

      {libraryActions ? (
        <div className={styles.settingsPanelFooter}>
          <ActionBar className={styles.libraryActionBar} right={libraryActions} />
        </div>
      ) : null}

      <ConfirmModal
        isOpen={resetModalState === "confirm"}
        title={t("heading.startNewLibrary")}
        confirmLabel={isResetting ? t("actions.clearingLibrary") : t("actions.startNewLibrary")}
        cancelLabel={t("actions.cancel")}
        isConfirming={isResetting}
        isConfirmDisabled={!hasAcknowledgedReset}
        onConfirm={() => void handleConfirmReset()}
        onCancel={() => {
          if (isResetting) return;
          setResetModalState("closed");
        }}
      >
        <div className="d-flex flex-column gap-3">
          <p className="mb-0">{t("confirm.startNewLibraryBody")}</p>
          <button
            type="button"
            className={`btn btn-outline-light btn-sm align-self-start ${styles.settingsPanelActionButton}`}
            onClick={startExport}
          >
            <span className={styles.settingsPanelActionIcon}>
              <Download size={16} aria-hidden="true" />
            </span>
            <span className={styles.settingsPanelActionLabel}>{t("actions.exportLibrary")}</span>
          </button>
          <label className={styles.libraryResetAcknowledge}>
            <input
              type="checkbox"
              className="form-check-input hq-checkbox"
              checked={hasAcknowledgedReset}
              onChange={(event) => setHasAcknowledgedReset(event.target.checked)}
            />
            <span>{t("confirm.startNewLibraryAcknowledgement")}</span>
          </label>
          {errorMessage ? (
            <div className={styles.libraryResetError} role="alert">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </ConfirmModal>

      <ModalShell
        isOpen={resetModalState === "complete"}
        onClose={() => setResetModalState("closed")}
        title={t("heading.libraryCleared")}
        contentClassName={styles.confirmPopover}
        footer={
          <ActionBar
            right={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setResetModalState("closed")}
              >
                {t("actions.continue")}
              </button>
            }
          />
        }
      >
        <div className="d-flex align-items-start gap-2">
          <Database className={styles.icon} aria-hidden="true" />
          <p className="mb-0">{t("label.libraryClearedDescription")}</p>
        </div>
      </ModalShell>
    </div>
  );
}
