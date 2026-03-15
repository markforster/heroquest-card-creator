"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import {
  formatSystemSettingsTimestamp,
  getSystemSettingsStoreLabel,
} from "@/components/Modals/SettingsModal/systemSettingsI18n";
import {
  getDbEstimateStatus,
  runFullDbEstimate,
  subscribeDbEstimateStatus,
} from "@/lib/indexeddb-size-tracker";
import { useI18n } from "@/i18n/I18nProvider";
import { APP_VERSION } from "@/version";

type StoreBreakdownEntry = {
  name: string;
  bytes: number;
  records: number;
  share: number;
  color: string;
};

const STORE_COLORS: Record<string, string> = {
  assets: "#a8842a",
  cards: "#b86a3a",
  "everything-else": "#6f7f42",
  "other-browser-storage": "#7b7368",
  pairs: "#8d5537",
  collections: "#4f7a88",
  meta: "#58786d",
  settings: "#68658d",
};

const FALLBACK_STORE_COLORS = ["#8d5537", "#6f7f42", "#4f7a88", "#58786d", "#68658d"];

type StorageDetailRowsProps = {
  title: string;
  data: StoreBreakdownEntry[];
  fallbackLabel: string;
  recordsLabel: string;
  t: ReturnType<typeof useI18n>["t"];
};

type StorageUsageBarProps = {
  data: StoreBreakdownEntry[];
  fallbackLabel: string;
  sectionLabel: string;
  recordsLabel: string;
  t: ReturnType<typeof useI18n>["t"];
};

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

function getStoreColor(store: string, fallbackIndex: number): string {
  return STORE_COLORS[store] ?? FALLBACK_STORE_COLORS[fallbackIndex % FALLBACK_STORE_COLORS.length];
}

function buildStorageChartData(
  byStore: Record<string, { bytes: number; records: number }>,
): StoreBreakdownEntry[] {
  const filtered = Object.entries(byStore)
    .filter(([, value]) => value.bytes > 0)
    .sort(([, a], [, b]) => b.bytes - a.bytes);

  const totalBytes = filtered.reduce((sum, [, value]) => sum + value.bytes, 0);
  if (totalBytes <= 0) return [];

  return filtered.map(([name, value], index) => ({
    name,
    bytes: value.bytes,
    records: value.records,
    share: value.bytes / totalBytes,
    color: getStoreColor(name, index),
  }));
}

function getStoreEntries(byStore: Record<string, { bytes: number; records: number }>) {
  return Object.entries(byStore) as Array<[string, { bytes: number; records: number }]>;
}

function clampToPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function buildOverallStorageData(
  totalBytes: number | null,
  byStore: Record<string, { bytes: number; records: number }>,
): StoreBreakdownEntry[] {
  if (totalBytes == null || !Number.isFinite(totalBytes) || totalBytes <= 0) return [];

  const assets = byStore.assets ?? { bytes: 0, records: 0 };
  const cards = byStore.cards ?? { bytes: 0, records: 0 };
  const otherEntries = getStoreEntries(byStore).filter(
    ([store, value]) => store !== "assets" && store !== "cards" && value.bytes > 0,
  );
  const otherBytes = otherEntries.reduce((sum, [, value]) => sum + value.bytes, 0);
  const otherRecords = otherEntries.reduce((sum, [, value]) => sum + value.records, 0);
  const libraryBytes = assets.bytes + cards.bytes + otherBytes;
  const nonLibraryBytes = Math.max(0, totalBytes - libraryBytes);

  return [
    {
      name: "assets",
      bytes: assets.bytes,
      records: assets.records,
      share: assets.bytes / totalBytes,
      color: STORE_COLORS.assets,
    },
    {
      name: "cards",
      bytes: cards.bytes,
      records: cards.records,
      share: cards.bytes / totalBytes,
      color: STORE_COLORS.cards,
    },
    {
      name: "everything-else",
      bytes: otherBytes,
      records: otherRecords,
      share: otherBytes / totalBytes,
      color: STORE_COLORS["everything-else"],
    },
    {
      name: "other-browser-storage",
      bytes: nonLibraryBytes,
      records: 0,
      share: nonLibraryBytes / totalBytes,
      color: STORE_COLORS["other-browser-storage"],
    },
  ].filter((entry) => entry.bytes > 0);
}

function buildRestDetailData(
  byStore: Record<string, { bytes: number; records: number }>,
): StoreBreakdownEntry[] {
  const restStores = Object.fromEntries(
    getStoreEntries(byStore).filter(
      ([store, value]) => store !== "assets" && store !== "cards" && value.bytes > 0,
    ),
  ) as Record<string, { bytes: number; records: number }>;

  return buildStorageChartData(restStores);
}

function StorageDetailRows({ title, data, fallbackLabel, recordsLabel, t }: StorageDetailRowsProps) {
  if (data.length === 0) return null;

  return (
    <section className={styles.storageBreakdownSection} aria-label={title}>
      <div className={styles.storageBreakdownSectionTitle}>{title}</div>
      <div className={styles.storageDetailRows}>
        {data.map((entry) => (
          <div key={entry.name} className={styles.storageDetailRow}>
            <div className={styles.storageDetailRowMain}>
              <span
                className={styles.storageBreakdownLegendSwatch}
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className={styles.storageDetailRowLabel}>
                {getSystemSettingsStoreLabel(entry.name, t)}: {formatBytes(entry.bytes, fallbackLabel)} (
                {entry.records} {recordsLabel})
              </span>
            </div>
            <span className={styles.storageUsageLegendShare}>{(entry.share * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StorageUsageBar({
  data,
  fallbackLabel,
  sectionLabel,
  recordsLabel,
  t,
}: StorageUsageBarProps) {
  if (data.length === 0) return null;

  return (
    <div className={styles.storageUsageSummary} aria-label={sectionLabel}>
      <div className={styles.storageUsageBar} aria-hidden="true">
        {data.map((entry) => (
          <div
            key={entry.name}
            className={styles.storageUsageBarSegment}
            style={{ width: `${clampToPercent(entry.share * 100)}%`, background: entry.color }}
          />
        ))}
      </div>
      <div className={styles.storageUsageLegend}>
        {data.map((entry) => (
          <div key={entry.name} className={styles.storageUsageLegendItem}>
            <span
              className={styles.storageBreakdownLegendSwatch}
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className={styles.settingsPanelOption}>
              {getSystemSettingsStoreLabel(entry.name, t)}: {formatBytes(entry.bytes, fallbackLabel)}
              {entry.records > 0 ? ` (${entry.records} ${recordsLabel})` : ""}
            </span>
            <span className={styles.storageUsageLegendShare}>{(entry.share * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SystemSettingsPanel() {
  const { language, t } = useI18n();
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
      setLastUpdated(formatSystemSettingsTimestamp(new Date(), language));
    } catch {
      setUsageBytes(null);
      setQuotaBytes(null);
      setLastUpdated(t("label.unavailable"));
    } finally {
      setIsLoading(false);
    }
  }, [language, t]);

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

  const overallStorageData = useMemo(
    () => buildOverallStorageData(usageBytes, dbEstimateStatus.byStore ?? {}),
    [usageBytes, dbEstimateStatus.byStore],
  );
  const restDetailData = useMemo(
    () => buildRestDetailData(dbEstimateStatus.byStore ?? {}),
    [dbEstimateStatus.byStore],
  );

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
              {t("label.reachOutOnItch")}
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
          <StorageUsageBar
            data={overallStorageData}
            fallbackLabel={t("label.unavailable")}
            sectionLabel={t("label.estimatedBrowserUsage")}
            recordsLabel={t("label.records")}
            t={t}
          />
          <div className={styles.settingsPanelOption}>
            {t("label.estimatedBrowserUsage")}: {formatBytes(usageBytes, t("label.unavailable"))}
          </div>
          {dbEstimateStatus.lastUpdated && restDetailData.length > 0 ? (
            <div className={styles.storageBreakdownCharts} aria-label={t("label.storage")}>
              {restDetailData.length > 0 ? (
                <StorageDetailRows
                  title={t("label.storageNonAssetBreakdown")}
                  data={restDetailData}
                  fallbackLabel={t("label.unavailable")}
                  recordsLabel={t("label.records")}
                  t={t}
                />
              ) : null}
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
