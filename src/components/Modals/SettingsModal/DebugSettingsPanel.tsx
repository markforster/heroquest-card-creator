"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { DangerNotice, SuccessNotice, WarningNotice } from "@/components/common/Notice";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { useDebugVisuals } from "@/components/Providers/DebugVisualsContext";
import { useI18n } from "@/i18n/I18nProvider";
import { apiClient } from "@/api/client";
import { readApiConfig } from "@/api/config";
import {
  getRemoteAssetHashIndexEnabled,
  getRemoteAssetThumbPrefetchEnabled,
  setRemoteAssetHashIndexEnabled,
  setRemoteAssetThumbPrefetchEnabled,
  subscribeRemoteAssetFlags,
} from "@/lib/remote-asset-flags";
import {
  getThumbnailJpegMigrationStatus,
  subscribeThumbnailJpegMigration,
} from "@/lib/thumbnail-jpeg-migration";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "0 B";
  const abs = Math.max(0, bytes);
  if (abs < 1024) return `${Math.round(abs)} B`;
  const kb = abs / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

export default function DebugSettingsPanel() {
  const { t } = useI18n();
  const { showTextBounds, setShowTextBounds } = useDebugVisuals();
  const isRemoteMode = readApiConfig().mode === "remote";
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const [isThumbPrefetchEnabled, setIsThumbPrefetchEnabled] = useState(() =>
    getRemoteAssetThumbPrefetchEnabled(),
  );
  const [isHashIndexEnabled, setIsHashIndexEnabled] = useState(() =>
    getRemoteAssetHashIndexEnabled(),
  );
  const [thumbMigrationStatus, setThumbMigrationStatus] = useState(() =>
    getThumbnailJpegMigrationStatus(),
  );

  useEffect(() => {
    return subscribeRemoteAssetFlags(() => {
      setIsThumbPrefetchEnabled(getRemoteAssetThumbPrefetchEnabled());
      setIsHashIndexEnabled(getRemoteAssetHashIndexEnabled());
    });
  }, []);

  useEffect(() => {
    return subscribeThumbnailJpegMigration((status) => {
      setThumbMigrationStatus(status);
    });
  }, []);

  const migrationProgress =
    thumbMigrationStatus.total > 0
      ? Math.min(
          100,
          Math.round((thumbMigrationStatus.processed / thumbMigrationStatus.total) * 100),
        )
      : 0;
  const bytesSaved = Math.max(
    0,
    thumbMigrationStatus.bytesBefore - thumbMigrationStatus.bytesAfter,
  );

  const handleClearAssetClassification = async () => {
    if (isClearing) return;
    setIsClearing(true);
    setClearMessage(null);
    setClearError(null);
    try {
      const count = await apiClient.resetAssetClassificationAll(undefined);
      setClearMessage(
        t("label.assetClassificationCleared").replace("${count}", String(count)),
      );
    } catch {
      setClearError(t("label.assetClassificationClearFailed"));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className={styles.settingsPanelBody}>
      <WarningNotice role="status">
        Debug is enabled while we work through version 0.5.x and will be turned off in a future
        release.
      </WarningNotice>
      <SettingsGroup title={t("label.debugVisuals")} className="d-flex flex-column gap-2">
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={showTextBounds}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setShowTextBounds(event.target.checked)
            }
          />
          {t("label.debugTextBounds")}
        </label>
      </SettingsGroup>
      <SettingsGroup title="Thumbnail JPEG Migration" className="d-flex flex-column gap-2">
        <div className="d-flex flex-column gap-2">
          <div className={styles.settingsPanelOption}>
            {thumbMigrationStatus.state === "running"
              ? "Thumbnail JPEG migration is running in the background."
              : thumbMigrationStatus.message ??
                (thumbMigrationStatus.state === "done"
                  ? "Thumbnail JPEG migration complete."
                  : "Thumbnail JPEG migration is idle.")}
          </div>
          {thumbMigrationStatus.total > 0 ? (
            <>
              <div className="progress" style={{ height: "8px" }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${migrationProgress}%` }}
                  aria-valuenow={migrationProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className={`d-flex flex-wrap gap-3 ${styles.settingsPanelOption}`}>
                <span>
                  Processed {thumbMigrationStatus.processed} / {thumbMigrationStatus.total}
                </span>
                <span>Converted {thumbMigrationStatus.converted}</span>
                <span>Skipped {thumbMigrationStatus.skipped}</span>
              </div>
              <div className={`d-flex flex-wrap gap-3 ${styles.settingsPanelOption}`}>
                <span>Start size {formatBytes(thumbMigrationStatus.bytesBefore)}</span>
                <span>Current size {formatBytes(thumbMigrationStatus.bytesAfter)}</span>
                <span>Saved {formatBytes(bytesSaved)}</span>
              </div>
            </>
          ) : null}
        </div>
      </SettingsGroup>
      {isRemoteMode ? (
        <SettingsGroup
          title="Remote Asset Fetch (Debug)"
          className="d-flex flex-column gap-2"
        >
          <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
            <input
              type="checkbox"
              className="form-check-input hq-checkbox"
              checked={isThumbPrefetchEnabled}
              onChange={(event) =>
                setRemoteAssetThumbPrefetchEnabled(event.target.checked)
              }
            />
            Asset thumbnail prefetch (remote)
          </label>
          <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
            <input
              type="checkbox"
              className="form-check-input hq-checkbox"
              checked={isHashIndexEnabled}
              onChange={(event) =>
                setRemoteAssetHashIndexEnabled(event.target.checked)
              }
            />
            Asset hash index (remote)
          </label>
        </SettingsGroup>
      ) : null}
      <SettingsGroup
        title={t("actions.clearAssetClassification")}
        className="d-flex flex-column gap-3"
      >
        <WarningNotice>
          {t("warning.clearAssetClassificationDestructive")}
        </WarningNotice>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleClearAssetClassification}
            disabled={isClearing}
          >
            {isClearing
              ? t("label.clearingAssetClassification")
              : t("actions.clearAssetClassification")}
          </button>
        </div>
        {clearMessage ? <SuccessNotice>{clearMessage}</SuccessNotice> : null}
        {clearError ? <DangerNotice>{clearError}</DangerNotice> : null}
      </SettingsGroup>
    </div>
  );
}
