"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import {
  getDbEstimateStatus,
  runFullDbEstimate,
  subscribeDbEstimateStatus,
} from "@/lib/indexeddb-size-tracker";
import { APP_VERSION } from "@/version";

function formatBytes(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return "Unavailable";
  const abs = Math.max(0, bytes);
  if (abs < 1024) return `${Math.round(abs)} B`;
  const kb = abs / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function formatBytesSafe(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return "Not yet calculated";
  return formatBytes(bytes);
}

export default function SystemSettingsPanel() {
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
      setLastUpdated("Unavailable");
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
      setLastUpdated("Unavailable");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      <SettingsGroup title="System Info" className="d-flex flex-column gap-2">
        <div className="d-flex flex-column gap-2">
          <div className={styles.settingsPanelOption}>App: HeroQuest Card Creator</div>
          <div className={styles.settingsPanelOption}>Version: {APP_VERSION}</div>
          <div className={styles.settingsPanelOption}>Developer: Mark Forster</div>
          <div className={styles.settingsPanelOption}>Date: 2026</div>
        </div>
      </SettingsGroup>
      <SettingsGroup
        title={
          <div className={styles.settingsGroupTitleRow}>
            <span>Storage</span>
            <span className={styles.settingsGroupMeta}>
              Last updated: {lastUpdated ?? "Pending"}
            </span>
          </div>
        }
        className="d-flex flex-column gap-3"
      >
        <div className="d-flex flex-column gap-2">
          <div className={styles.settingsPanelOption}>
            Estimated total browser app usage: {formatBytes(usageBytes)}
          </div>
          <div className={styles.settingsPanelOption}>
            Estimated Library Size:{" "}
            {formatBytesSafe(dbEstimateStatus.lastUpdated ? dbEstimateStatus.totalBytes : null)}
          </div>
          <div className={styles.settingsPanelOption}>
            Records scanned:{" "}
            {dbEstimateStatus.lastUpdated ? dbEstimateStatus.recordsScanned : "Not yet calculated"}
          </div>
          {Object.keys(dbEstimateStatus.byStore ?? {}).length > 0 ? (
            <div className="d-flex flex-column gap-1">
              {Object.entries(dbEstimateStatus.byStore).map(([store, value]) => (
                <div key={store} className={styles.settingsPanelOption}>
                  {store.charAt(0).toUpperCase() + store.slice(1)}: {formatBytes(value.bytes)} ({value.records} records)
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
            {dbEstimateLoading ? "Refreshing..." : "Refresh IndexedDB estimate"}
          </button>
        </div>
      </SettingsGroup>
    </div>
  );
}
