"use client";

import styles from "@/app/page.module.css";

type BackupProgressOverlayProps = {
  isOpen: boolean;
  title: string;
  statusLabel?: string | null;
  secondaryLabel?: string | null;
  secondaryPercent?: number | null;
  current: number;
  total: number;
};

export default function BackupProgressOverlay({
  isOpen,
  title,
  statusLabel,
  secondaryLabel,
  current,
  total,
}: BackupProgressOverlayProps) {
  if (!isOpen) return null;

  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const mainPercentValue = current >= total && total > 0 ? 100 : percent;
  const showSecondary = Boolean(secondaryLabel);

  return (
    <div className={styles.stockpileOverlayBackdrop}>
      <div className={`${styles.stockpileOverlayPanel} ${styles.uploadProgressPanel}`}>
        <div className={styles.stockpileOverlayHeader}>
          <h3 className={styles.stockpileOverlayTitle}>{title}</h3>
        </div>
        <div className="d-flex flex-column gap-2">
          {!showSecondary && statusLabel ? <div>{statusLabel}</div> : null}
          {!showSecondary ? (
            <>
              <div className={styles.exportProgressTrack} aria-hidden="true">
                <div
                  className={styles.exportProgressFill}
                  style={{ width: `${mainPercentValue}%`, transition: "none" }}
                />
              </div>
              <div className={styles.exportProgressLabel}>
                {current} / {total}
              </div>
            </>
          ) : null}
          {showSecondary ? (
            <>
              <div>{secondaryLabel}</div>
              <div className={styles.spinner} aria-hidden="true" />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
