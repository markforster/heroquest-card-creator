"use client";

import { createContext, useContext, useRef, useState } from "react";

import BackupProgressOverlay from "@/components/BackupProgressOverlay";
import ConfirmModal from "@/components/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";
import { createBackupHqcc, importBackupHqcc, importBackupJson } from "@/lib/backup";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";

import type { ChangeEvent, ReactNode } from "react";

type LibraryTransferContextValue = {
  isBusy: boolean;
  isExporting: boolean;
  isImporting: boolean;
  openExport: () => void;
  openImport: () => void;
};

const LibraryTransferContext = createContext<LibraryTransferContextValue | null>(null);

export function useLibraryTransfer() {
  const context = useContext(LibraryTransferContext);
  if (!context) {
    throw new Error("useLibraryTransfer must be used within LibraryTransferProvider");
  }
  return context;
}

type LibraryTransferProviderProps = {
  children: ReactNode;
};

export function LibraryTransferProvider({ children }: LibraryTransferProviderProps) {
  const { t } = useI18n();
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
      void openDownloadsFolderIfTauri();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[LibraryTransferProvider] Failed to export backup", error);
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

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
      console.error("[LibraryTransferProvider] Failed to import backup", error);
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

  const contextValue: LibraryTransferContextValue = {
    isBusy: isExporting || isImporting,
    isExporting,
    isImporting,
    openExport: handleExport,
    openImport: handleImportClick,
  };

  return (
    <LibraryTransferContext.Provider value={contextValue}>
      {children}
      <input
        ref={fileInputRef}
        type="file"
        accept=".hqcc,.hqcc.json,application/zip,application/json"
        style={{ display: "none" }}
        onChange={handleImportFileChange}
      />
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
    </LibraryTransferContext.Provider>
  );
}
