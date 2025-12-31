"use client";

import { useRef, useState } from "react";

import styles from "@/app/page.module.css";
import BackupProgressOverlay from "@/components/BackupProgressOverlay";
import HelpModal from "@/components/HelpModal";
import ReleaseNotesModal from "@/components/ReleaseNotesModal";
import { usePopupState } from "@/hooks/usePopupState";
import { createBackupHqcc, importBackupHqcc, importBackupJson } from "@/lib/backup";
import { APP_VERSION } from "@/version";

export default function MainFooter() {
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    if (isExporting || isImporting) return;
    setIsExporting(true);
    setBackupProgressMode("export");
    setBackupProgressCurrent(0);
    setBackupProgressTotal(0);
    setBackupProgressStatus("Preparing...");
    setBackupSecondaryLabel(null);
    setBackupSecondaryPercent(null);
    try {
      const { blob, fileName } = await createBackupHqcc({
        onProgress: (current, total) => {
          setBackupProgressCurrent(current);
          setBackupProgressTotal(total);
          setBackupProgressStatus("Exporting data...");
          setBackupSecondaryLabel(null);
          setBackupSecondaryPercent(null);
        },
        onStatus: (phase) => {
          if (phase === "finalizing") {
            setBackupProgressStatus("Finalizing...");
            setBackupSecondaryLabel("Finalizing...");
            setBackupSecondaryPercent(0);
          } else if (phase === "processing") {
            setBackupProgressStatus("Exporting data...");
            setBackupSecondaryLabel(null);
            setBackupSecondaryPercent(null);
          } else {
            setBackupProgressStatus("Preparing...");
            setBackupSecondaryLabel("Preparing...");
          }
        },
        onSecondaryProgress: (percent, phase) => {
          if (phase === "finalizing") {
            setBackupSecondaryLabel("Finalizing...");
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
      window.alert("Could not export data. Please check your browser settings and try again.");
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
    const confirmed = window.confirm(
      "Importing data will replace all existing cards, assets, and related data in this browser. Continue?",
    );
    if (!confirmed) return;
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
    setBackupProgressStatus("Preparing...");
    setBackupSecondaryLabel("Preparing...");
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
              setBackupProgressStatus("Importing data...");
              setBackupSecondaryLabel(null);
              setBackupSecondaryPercent(null);
            },
            onStatus: (phase) => {
              setBackupProgressStatus(
                phase === "processing" ? "Importing data..." : "Preparing...",
              );
              if (phase === "processing") {
                setBackupSecondaryLabel(null);
                setBackupSecondaryPercent(null);
              } else {
                setBackupSecondaryLabel("Preparing...");
                setBackupSecondaryPercent(null);
              }
            },
          })
        : useJson
          ? await importBackupJson(file, {
              onProgress: (current, total) => {
                setBackupProgressCurrent(current);
                setBackupProgressTotal(total);
                setBackupProgressStatus("Importing data...");
                setBackupSecondaryLabel(null);
                setBackupSecondaryPercent(null);
              },
              onStatus: (phase) => {
                setBackupProgressStatus(
                  phase === "processing" ? "Importing data..." : "Preparing...",
                );
                if (phase === "processing") {
                  setBackupSecondaryLabel(null);
                  setBackupSecondaryPercent(null);
                } else {
                  setBackupSecondaryLabel("Preparing...");
                  setBackupSecondaryPercent(null);
                }
              },
            })
          : await (async () => {
              throw new Error("Unsupported backup file type. Please choose a .hqcc backup file.");
            })();
      await new Promise((resolve) => setTimeout(resolve, 250));
      window.alert(
        `Import complete.\nCards: ${result.cardsCount}\nAssets: ${result.assetsCount}\nCollections: ${result.collectionsCount}`,
      );
      window.location.reload();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[MainFooter] Failed to import backup", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Could not import data. Please check the backup file and try again.",
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
              Help
            </button>
            <span>·</span>
            <button
              type="button"
              className={styles.footerLink}
              onClick={releaseNotesModal.open}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              About &amp; release notes
            </button>
            <span>·</span>
            <a
              href="https://public.markforster.info/Heroquest/Tools/heroquest-card-maker.zip"
              target="_blank"
              rel="noreferrer noopener"
              className={styles.footerLink}
            >
              Download
            </a>
            <span>·</span>
            <button
              type="button"
              className={styles.footerLink}
              onClick={handleExport}
              disabled={isBusy}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              title="Export your cards and assets to a backup file"
            >
              {isExporting ? "Exporting…" : "Export data"}
            </button>
            <span>·</span>
            <button
              type="button"
              className={styles.footerLink}
              onClick={handleImportClick}
              disabled={isBusy}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              title="Import a backup file to restore cards and assets (replaces existing data)"
            >
              {isImporting ? "Importing…" : "Import data"}
            </button>
          </div>
          <div className="ms-auto d-flex align-items-center gap-1">
            <span>·</span>
            <span title="App version">v{APP_VERSION}</span>
            <span>·</span>
            <span>Made with</span>
            <span className={styles.footerHeart} aria-hidden="true">
              ♥
            </span>
            <span>by</span>
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
        title={backupProgressMode === "import" ? "Importing data..." : "Exporting data..."}
        statusLabel={backupProgressStatus}
        secondaryLabel={backupSecondaryLabel}
        secondaryPercent={backupSecondaryPercent}
        current={backupProgressCurrent}
        total={backupProgressTotal}
      />
    </>
  );
}
