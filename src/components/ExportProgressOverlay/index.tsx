"use client";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import ProgressBar from "@/components/common/ProgressBar";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

type ExportProgressOverlayProps = {
  isOpen: boolean;
  title: string;
  progress: number;
  total: number;
  exportCancelled: boolean;
  onCancel: () => void;
};

export default function ExportProgressOverlay({
  isOpen,
  title,
  progress,
  total,
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      contentClassName={styles.stockpileOverlayPanel}
      keepMounted
    >
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
