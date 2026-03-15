"use client";

import { createContext, useContext, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import BackupProgressOverlay from "@/components/BackupProgressOverlay";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";
import { readApiConfig } from "@/api/config";
import { createBackupHqcc, importBackupHqcc, importBackupJson } from "@/lib/backup";
import {
  BACKUP_FORMAT_STORAGE_KEY,
  DEFAULT_BACKUP_FORMAT,
  normalizeBackupFormat,
  type BackupContainerFormat,
} from "@/lib/backup-formats";
import { invalidateCardThumbnail } from "@/lib/card-thumbnail-cache";
import { EXPORT_SETTINGS_STORAGE_KEYS } from "@/lib/export-settings";
import { clearDbEstimateCache, setDbEstimatePaused } from "@/lib/indexeddb-size-tracker";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";
import {
  useLocalStorageRehydrate,
  useLocalStorageValue,
} from "@/components/Providers/LocalStorageProvider";
import { useQueryClient } from "@tanstack/react-query";

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
  const backupSecondaryModeRef = useRef<"worker" | "fallback" | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const rehydrateLocalStorage = useLocalStorageRehydrate();
  const [backupFormat, setBackupFormat] = useLocalStorageValue<BackupContainerFormat>(
    BACKUP_FORMAT_STORAGE_KEY,
    DEFAULT_BACKUP_FORMAT,
    {
      parse: (raw) => normalizeBackupFormat(raw) ?? null,
      serialize: (value) => value,
    },
  );

  const resolveWsUrl = (baseUrl: string) => {
    const url = new URL("/ws", baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  };

  const resolveImportStatus = (status?: string) => {
    switch (status) {
      case "queued":
        return t("status.preparing");
      case "running":
        return t("status.importingData");
      case "complete":
        return t("status.importingData");
      case "error":
        return t("alert.importFailed");
      default:
        return t("status.preparing");
    }
  };

  const runRemoteImport = async (
    file: File,
  ): Promise<{ cardsCount: number; assetsCount: number; collectionsCount: number }> => {
    const apiConfig = readApiConfig();
    if (apiConfig.mode !== "remote" || !apiConfig.baseUrl) {
      throw new Error(t("alert.importFailed"));
    }

    const form = new FormData();
    form.append("file", file);
    form.append("fileName", file.name);

    const response = await fetch(new URL("/library/import", apiConfig.baseUrl).toString(), {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      throw new Error(t("alert.importFailed"));
    }

    const payload = (await response.json()) as { jobId?: string };
    if (!payload.jobId) {
      throw new Error(t("alert.importFailed"));
    }

    const jobId = payload.jobId;
    setBackupProgressTotal(100);
    setBackupProgressCurrent(0);

    return await new Promise<{ cardsCount: number; assetsCount: number; collectionsCount: number }>(
      (resolve, reject) => {
        let settled = false;
        let pollTimer: number | null = null;

        const finish = (result: { cardsCount: number; assetsCount: number; collectionsCount: number }) => {
          if (settled) return;
          settled = true;
          if (pollTimer) {
            window.clearInterval(pollTimer);
          }
          resolve(result);
        };

        const fail = (message?: string) => {
          if (settled) return;
          settled = true;
          if (pollTimer) {
            window.clearInterval(pollTimer);
          }
          reject(new Error(message || t("alert.importFailed")));
        };

        const handleJobUpdate = (job: {
          status?: string;
          progress?: number;
          message?: string;
          result?: { cardsCount: number; assetsCount: number; collectionsCount: number };
        }) => {
          const progress = typeof job.progress === "number" ? job.progress : 0;
          setBackupProgressCurrent(progress);
          setBackupProgressStatus(resolveImportStatus(job.status));
          setBackupSecondaryLabel(null);
          setBackupSecondaryPercent(null);

          if (job.status === "complete") {
            finish(job.result ?? { cardsCount: 0, assetsCount: 0, collectionsCount: 0 });
          } else if (job.status === "error") {
            fail(job.message);
          }
        };

        const startPolling = () => {
          if (pollTimer) return;
          pollTimer = window.setInterval(async () => {
            try {
              const res = await fetch(
                new URL(
                  `/library/import/${jobId}`,
                  apiConfig.baseUrl ?? window.location.origin,
                ).toString(),
              );
              if (!res.ok) return;
              const job = (await res.json()) as {
                status?: string;
                progress?: number;
                message?: string;
                result?: { cardsCount: number; assetsCount: number; collectionsCount: number };
              };
              handleJobUpdate(job);
            } catch {
              // ignore polling errors
            }
          }, 1000);
        };

        const ws = new WebSocket(resolveWsUrl(apiConfig.baseUrl ?? window.location.origin));
        ws.addEventListener("open", () => {
          ws.send(JSON.stringify({ type: "subscribe", jobId }));
        });
        ws.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data as string) as {
              status?: string;
              progress?: number;
              message?: string;
              result?: { cardsCount: number; assetsCount: number; collectionsCount: number };
            };
            handleJobUpdate(data);
          } catch {
            // ignore parse errors
          }
        });
        ws.addEventListener("error", () => {
          ws.close();
          startPolling();
        });
        ws.addEventListener("close", () => {
          if (!settled) {
            startPolling();
          }
        });
      },
    );
  };

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
      case "Unsupported backup format":
        return t("alert.unsupportedBackupFile");
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
    backupSecondaryModeRef.current = null;
    try {
      const { blob, fileName } = await createBackupHqcc({
        format: backupFormat,
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
        onSecondaryStatus: (mode) => {
          backupSecondaryModeRef.current = mode;
          if (mode === "fallback") {
            setBackupSecondaryLabel(t("status.finalizing"));
            setBackupSecondaryPercent(null);
          }
        },
        onSecondaryProgress: (percent, phase) => {
          if (phase === "finalizing") {
            if (backupSecondaryModeRef.current === "fallback") return;
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
      backupSecondaryModeRef.current = null;
    }
  };

  const handleExportClick = () => {
    if (isExporting || isImporting) return;
    setIsExportConfirmOpen(true);
  };

  const handleExportConfirm = () => {
    setIsExportConfirmOpen(false);
    void handleExport();
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

    setDbEstimatePaused(true);
    clearDbEstimateCache();
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

      let result: { cardsCount: number; assetsCount: number; collectionsCount: number };

      const apiConfig = readApiConfig();
      if (apiConfig.mode === "remote") {
        if (!useZip && !useJson) {
          throw new Error(t("alert.unsupportedBackupFile"));
        }
        result = await runRemoteImport(file);
      } else {
        result = useZip
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
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      const exportSettingKeys = Object.values(EXPORT_SETTINGS_STORAGE_KEYS);
      rehydrateLocalStorage([
        "hqcc.activeCards.v1",
        "hqcc.statLabels",
        ...exportSettingKeys,
      ]);
      invalidateCardThumbnail();
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
        window.dispatchEvent(new CustomEvent("hqcc-assets-updated"));
      }
      window.alert(
        `${t("alert.importComplete")}\n${t("label.cards")}: ${result.cardsCount}\n${t(
          "label.assets",
        )}: ${result.assetsCount}\n${t("label.collections")}: ${result.collectionsCount}`,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[LibraryTransferProvider] Failed to import backup", error);
      window.alert(
        error instanceof Error ? resolveImportErrorMessage(error.message) : t("alert.importFailed"),
      );
    } finally {
      setDbEstimatePaused(false);
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
    openExport: handleExportClick,
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
      <ConfirmModal
        isOpen={isExportConfirmOpen}
        title={t("heading.exportData")}
        confirmLabel={t("actions.export")}
        cancelLabel={t("actions.cancel")}
        onConfirm={handleExportConfirm}
        onCancel={() => setIsExportConfirmOpen(false)}
      >
        <div className="d-flex flex-column gap-3">
          <div>{t("confirm.exportStart")}</div>
          <div className={styles.exportFormatBlock}>
            <div className={styles.exportFormatTitle}>{t("label.backupFormat")}</div>
            <div className={styles.exportFormatOptions}>
              <label className={`${styles.exportFormatOption} d-flex align-items-start gap-3`}>
                <input
                  type="radio"
                  className="form-check-input hq-checkbox"
                  name="backup-format"
                  value="compact-zip-v1"
                  aria-label={t("label.backupFormatCompact")}
                  checked={backupFormat === "compact-zip-v1"}
                  onChange={() => setBackupFormat("compact-zip-v1")}
                />
                <span>
                  <span className={styles.exportFormatLabel}>{t("label.backupFormatCompact")}</span>
                  <span className={styles.exportFormatHint}>{t("helper.backupFormatCompact")}</span>
                </span>
              </label>
              <label className={`${styles.exportFormatOption} d-flex align-items-start gap-3`}>
                <input
                  type="radio"
                  className="form-check-input hq-checkbox"
                  name="backup-format"
                  value="legacy-zip-json"
                  aria-label={t("label.backupFormatStandard")}
                  checked={backupFormat === "legacy-zip-json"}
                  onChange={() => setBackupFormat("legacy-zip-json")}
                />
                <span>
                  <span className={styles.exportFormatLabel}>{t("label.backupFormatStandard")}</span>
                  <span className={styles.exportFormatHint}>{t("helper.backupFormatStandard")}</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </ConfirmModal>
    </LibraryTransferContext.Provider>
  );
}
