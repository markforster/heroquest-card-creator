"use client";

import { useRef, useState } from "react";

import styles from "@/app/page.module.css";
import BackupProgressOverlay from "@/components/BackupProgressOverlay";
import ConfirmModal from "@/components/ConfirmModal";
import HelpModal from "@/components/HelpModal";
import ReleaseNotesModal from "@/components/ReleaseNotesModal";
import { useI18n } from "@/i18n/I18nProvider";
import { usePopupState } from "@/hooks/usePopupState";
import { createBackupHqcc, importBackupHqcc, importBackupJson } from "@/lib/backup";
import { APP_VERSION } from "@/version";

export default function MainFooter() {
  const { t } = useI18n();
  const helpModal = usePopupState(false);
  const releaseNotesModal = usePopupState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupProgressCurrent, setBackupProgressCurrent] = useState(0);
  const [backupProgressTotal, setBackupProgressTotal] = useState(0);
  const [backupProgressMode, setBackupProgressMode] = useState<"export" | "import" | null>(null);
  const [backupProgressStatus, setBackupProgressStatus] = useState<string | null>(null);
  const [backupSecondaryLabel, setBackupSecondaryLabel] = useState<string | null>(null);
  const [backupSecondaryPercent, setBackupSecondaryPercent] = useState<number | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolveImportErrorMessage = (message: string) => {
    switch (message) {
      case "Invalid data URL: missing data: prefix":
        return t("alert.invalidDataUrlPrefix");
      case "Invalid data URL: missing comma separator":
        return t("alert.invalidDataUrlSeparator");
      case "Invalid data URL: failed to decode payload":
        return t("alert.invalidDataUrlDecode");
      case "Invalid backup file structure":
        return t("alert.invalidBackupStructure");
      case "Invalid backup file: missing localStorage section":
        return t("alert.invalidBackupMissingLocalStorage");
      case "Could not read the selected backup file":
        return t("alert.couldNotReadBackupFile");
      case "Could not read backup data from this file":
        return t("alert.couldNotReadBackupData");
      default:
        return message;
    }
  };

  const handleExport = async () => {
    if (isExporting || isImporting) return;
    setIsExporting(true);
    setBackupProgressMode("export");
    setBackupProgressCurrent(0);
    setBackupProgressTotal(0);
    setBackupProgressStatus(t("status.preparing"));
    setBackupSecondaryLabel(null);
    setBackupSecondaryPercent(null);
    try {
      const { blob, fileName } = await createBackupHqcc({
        onProgress: (current, total) => {
          setBackupProgressCurrent(current);
          setBackupProgressTotal(total);
          setBackupProgressStatus(t("status.exportingData"));
          setBackupSecondaryLabel(null);
          setBackupSecondaryPercent(null);
        },
        onStatus: (phase) => {
          if (phase === "finalizing") {
            setBackupProgressStatus(t("status.finalizing"));
            setBackupSecondaryLabel(t("status.finalizing"));
            setBackupSecondaryPercent(0);
          } else if (phase === "processing") {
            setBackupProgressStatus(t("status.exportingData"));
            setBackupSecondaryLabel(null);
            setBackupSecondaryPercent(null);
          } else {
            setBackupProgressStatus(t("status.preparing"));
            setBackupSecondaryLabel(t("status.preparing"));
          }
        },
        onSecondaryProgress: (percent, phase) => {
          if (phase === "finalizing") {
            setBackupSecondaryLabel(t("status.finalizing"));
            setBackupSecondaryPercent(percent);
          }
        },
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[MainFooter] Failed to export backup", error);
      window.alert(t("alert.exportDataFailed"));
    } finally {
      setIsExporting(false);
      setBackupProgressMode(null);
      setBackupProgressStatus(null);
      setBackupSecondaryLabel(null);
      setBackupSecondaryPercent(null);
    }
  };

  const handleImportClick = () => {
    if (isExporting || isImporting) return;
    setIsImportConfirmOpen(true);
  };

  const handleImportConfirm = () => {
    setIsImportConfirmOpen(false);
    const input = fileInputRef.current;
    if (input) {
      input.value = "";
      input.click();
    }
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupProgressMode("import");
    setBackupProgressCurrent(0);
    setBackupProgressTotal(0);
    setBackupProgressStatus(t("status.preparing"));
    setBackupSecondaryLabel(t("status.preparing"));
    setBackupSecondaryPercent(null);
    try {
      const lowerName = file.name.toLowerCase();
      const useZip = lowerName.endsWith(".hqcc");
      const useJson = !useZip && lowerName.endsWith(".hqcc.json");

      const result = useZip
        ? await importBackupHqcc(file, {
            onProgress: (current, total) => {
              setBackupProgressCurrent(current);
              setBackupProgressTotal(total);
              setBackupProgressStatus(t("status.importingData"));
              setBackupSecondaryLabel(null);
              setBackupSecondaryPercent(null);
            },
            onStatus: (phase) => {
              setBackupProgressStatus(
                phase === "processing" ? t("status.importingData") : t("status.preparing"),
              );
              if (phase === "processing") {
                setBackupSecondaryLabel(null);
                setBackupSecondaryPercent(null);
              } else {
                setBackupSecondaryLabel(t("status.preparing"));
                setBackupSecondaryPercent(null);
              }
            },
          })
        : useJson
          ? await importBackupJson(file, {
              onProgress: (current, total) => {
                setBackupProgressCurrent(current);
                setBackupProgressTotal(total);
                setBackupProgressStatus(t("status.importingData"));
                setBackupSecondaryLabel(null);
                setBackupSecondaryPercent(null);
              },
              onStatus: (phase) => {
                setBackupProgressStatus(
                  phase === "processing" ? t("status.importingData") : t("status.preparing"),
                );
                if (phase === "processing") {
                  setBackupSecondaryLabel(null);
                  setBackupSecondaryPercent(null);
                } else {
                  setBackupSecondaryLabel(t("status.preparing"));
                  setBackupSecondaryPercent(null);
                }
              },
            })
          : await (async () => {
              throw new Error(t("alert.unsupportedBackupFile"));
            })();
      await new Promise((resolve) => setTimeout(resolve, 250));
      window.alert(
        `${t("alert.importComplete")}\n${t("label.cards")}: ${result.cardsCount}\n${t(
          "label.assets",
        )}: ${result.assetsCount}\n${t("label.collections")}: ${result.collectionsCount}`,
      );
      window.location.reload();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[MainFooter] Failed to import backup", error);
      window.alert(
        error instanceof Error ? resolveImportErrorMessage(error.message) : t("alert.importFailed"),
      );
    } finally {
      setIsImporting(false);
      setBackupProgressMode(null);
      setBackupProgressStatus(null);
      setBackupSecondaryLabel(null);
      setBackupSecondaryPercent(null);
    }
  };

  const isBusy = isExporting || isImporting;

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
            <span>·</span>
            <button
              type="button"
              className={styles.footerLink}
              onClick={handleExport}
              disabled={isBusy}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              title={t("tooltip.exportBackup")}
            >
              {isExporting ? t("actions.exporting") : t("actions.exportData")}
            </button>
            <span>·</span>
            <button
              type="button"
              className={styles.footerLink}
              onClick={handleImportClick}
              disabled={isBusy}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              title={t("tooltip.importBackup")}
            >
              {isImporting ? t("actions.importing") : t("actions.importData")}
            </button>
          </div>
          <div className="ms-auto d-flex align-items-center gap-1">
            <span>·</span>
            <span title={t("tooltip.appVersion")}>v{APP_VERSION}</span>
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".hqcc,.hqcc.json,application/zip,application/json"
        style={{ display: "none" }}
        onChange={handleImportFileChange}
      />
      <HelpModal isOpen={helpModal.isOpen} onClose={helpModal.close} />
      <ReleaseNotesModal isOpen={releaseNotesModal.isOpen} onClose={releaseNotesModal.close} />
      <BackupProgressOverlay
        isOpen={Boolean(backupProgressMode)}
        title={
          backupProgressMode === "import" ? t("status.importingData") : t("status.exportingData")
        }
        statusLabel={backupProgressStatus}
        secondaryLabel={backupSecondaryLabel}
        secondaryPercent={backupSecondaryPercent}
        current={backupProgressCurrent}
        total={backupProgressTotal}
      />
      <ConfirmModal
        isOpen={isImportConfirmOpen}
        title={t("heading.importData")}
        confirmLabel={t("actions.import")}
        cancelLabel={t("actions.cancel")}
        onConfirm={handleImportConfirm}
        onCancel={() => setIsImportConfirmOpen(false)}
      >
        {t("confirm.importReplaceData")}
      </ConfirmModal>
    </>
  );
}
