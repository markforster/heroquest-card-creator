"use client";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import ModalShell from "@/components/common/ModalShell";
import ProgressBar from "@/components/common/ProgressBar";
import { useI18n } from "@/i18n/I18nProvider";

type ExportProgressOverlayProps = {
  isOpen: boolean;
  title: string;
  progress: number;
  total: number;
  secondaryLabel?: string | null;
  secondaryPercent?: number | null;
  exportCancelled: boolean;
  onCancel: () => void;
};

export default function ExportProgressOverlay({
  isOpen,
  title,
  progress,
  total,
  secondaryLabel,
  secondaryPercent,
  exportCancelled,
  onCancel,
}: ExportProgressOverlayProps) {
  const { t } = useI18n();
  if (!isOpen) {
    return null;
  }

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  const cancelLabel = exportCancelled ? t("actions.cancelling") : t("actions.cancel");
  const cancelDisabled = exportCancelled;
  const showSecondary = Boolean(secondaryLabel);
  const secondaryValue = typeof secondaryPercent === "number" ? Math.round(secondaryPercent) : 0;
  const secondaryIndeterminate = showSecondary && secondaryPercent == null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      contentClassName={styles.stockpileOverlayPanel}
      keepMounted
    >
      <div className="d-flex flex-column gap-3">
        <ProgressBar
          percent={percent}
          trackClassName={styles.exportProgressTrack}
          fillClassName={styles.exportProgressFill}
          label={
            <div className={styles.exportProgressLabel}>
              {progress} / {total}
            </div>
          }
        />
        {showSecondary ? (
          secondaryIndeterminate ? (
            <div className="d-flex align-items-center gap-2">
              <div className={styles.spinner} aria-hidden="true" />
              <div className={styles.exportProgressLabel}>{secondaryLabel}</div>
            </div>
          ) : (
            <ProgressBar
              percent={secondaryValue}
              trackClassName={styles.exportProgressTrack}
              fillClassName={styles.exportProgressFill}
              label={
                <div className={styles.exportProgressLabel}>
                  {secondaryLabel} {secondaryValue}%
                </div>
              }
            />
          )
        ) : null}
      </div>
      <div className={styles.stockpileOverlayActions}>
        <ActionBar
          right={
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={cancelDisabled}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          }
        />
      </div>
    </ModalShell>
  );
}
