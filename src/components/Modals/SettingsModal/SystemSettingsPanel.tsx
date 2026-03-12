"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import {
  getDbEstimateStatus,
  runFullDbEstimate,
  subscribeDbEstimateStatus,
} from "@/lib/indexeddb-size-tracker";
import { useI18n } from "@/i18n/I18nProvider";
import { APP_VERSION } from "@/version";

function formatBytes(bytes: number | null, fallback: string): string {
  if (bytes == null || !Number.isFinite(bytes)) return fallback;
  const abs = Math.max(0, bytes);
  if (abs < 1024) return `${Math.round(abs)} B`;
  const kb = abs / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function formatBytesSafe(bytes: number | null, fallback: string): string {
  if (bytes == null || !Number.isFinite(bytes)) return fallback;
  return formatBytes(bytes, fallback);
}

export default function SystemSettingsPanel() {
  const { t } = useI18n();
  const [usageBytes, setUsageBytes] = useState<number | null>(null);
  const [quotaBytes, setQuotaBytes] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dbEstimateStatus, setDbEstimateStatus] = useState(() => getDbEstimateStatus());
  const [dbEstimateLoading, setDbEstimateLoading] = useState(false);

  const refreshStorageEstimate = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      setUsageBytes(null);
      setQuotaBytes(null);
      setLastUpdated(t("label.unavailable"));
      return;
    }

    setIsLoading(true);
    try {
      const estimate = await navigator.storage.estimate();
      setUsageBytes(typeof estimate.usage === "number" ? estimate.usage : null);
      setQuotaBytes(typeof estimate.quota === "number" ? estimate.quota : null);
      setLastUpdated(new Date().toLocaleString());
    } catch {
      setUsageBytes(null);
      setQuotaBytes(null);
      setLastUpdated(t("label.unavailable"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshStorageEstimate();
  }, [refreshStorageEstimate]);

  useEffect(() => {
    return subscribeDbEstimateStatus((status) => {
      setDbEstimateStatus(status);
    });
  }, []);

  const refreshDbEstimate = useCallback(async () => {
    setDbEstimateLoading(true);
    setIsLoading(true);
    try {
      await Promise.all([refreshStorageEstimate(), runFullDbEstimate()]);
    } finally {
      setIsLoading(false);
      setDbEstimateLoading(false);
    }
  }, [refreshStorageEstimate]);

  return (
    <div className={styles.settingsPanelBody}>
      <SettingsGroup title={t("label.systemInfo")} className="d-flex flex-column gap-2">
        <div className="d-flex flex-column gap-2">
          <div className={styles.settingsPanelOption}>{t("label.app")}: HeroQuest Card Creator</div>
          <div className={styles.settingsPanelOption}>
            {t("label.version")}: {APP_VERSION}
          </div>
          <div className={styles.settingsPanelOption}>
            {t("label.developer")}:{" "}
            <a
              href="https://mark-forster.itch.io/"
              target="_blank"
              rel="noreferrer noopener"
              className={styles.footerLink}
            >
              Mark Forster
            </a>
          </div>
          <div className={styles.settingsPanelOption}>
            {t("label.community")}:{" "}
            <a
              href="https://mark-forster.itch.io/heroquest-card-creator/community"
              target="_blank"
              rel="noreferrer noopener"
              className={styles.footerLink}
            >
              Reach out on itch.io
            </a>
          </div>
        </div>
      </SettingsGroup>
      <SettingsGroup
        title={
          <div className={styles.settingsGroupTitleRow}>
            <span>{t("label.storage")}</span>
            <span className={styles.settingsGroupMeta}>
              {t("label.lastUpdated")}: {lastUpdated ?? t("label.pending")}
            </span>
          </div>
        }
        className="d-flex flex-column gap-3"
      >
        <div className="d-flex flex-column gap-2">
          <div className={styles.settingsPanelOption}>
            {t("label.estimatedBrowserUsage")}: {formatBytes(usageBytes, t("label.unavailable"))}
          </div>
          <div className={styles.settingsPanelOption}>
            {t("label.estimatedLibrarySize")}:{" "}
            {formatBytesSafe(
              dbEstimateStatus.lastUpdated ? dbEstimateStatus.totalBytes : null,
              t("label.notYetCalculated"),
            )}
          </div>
          <div className={styles.settingsPanelOption}>
            {t("label.recordsScanned")}:{" "}
            {dbEstimateStatus.lastUpdated
              ? dbEstimateStatus.recordsScanned
              : t("label.notYetCalculated")}
          </div>
          {Object.keys(dbEstimateStatus.byStore ?? {}).length > 0 ? (
            <div className="d-flex flex-column gap-1">
              {Object.entries(dbEstimateStatus.byStore).map(([store, value]) => (
                <div key={store} className={styles.settingsPanelOption}>
                  {store.charAt(0).toUpperCase() + store.slice(1)}:{" "}
                  {formatBytes(value.bytes, t("label.unavailable"))} ({value.records}{" "}
                  {t("label.records")})
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={refreshDbEstimate}
            disabled={dbEstimateLoading}
          >
            {dbEstimateLoading ? t("actions.refreshing") : t("actions.refreshStorageEstimate")}
          </button>
        </div>
      </SettingsGroup>
    </div>
  );
}
