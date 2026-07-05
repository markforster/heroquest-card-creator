"use client";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import ModalShell from "@/components/common/ModalShell";
import ProgressBar from "@/components/common/ProgressBar";
import { useI18n } from "@/i18n/I18nProvider";

type PdfExportProgressModalProps = {
  isOpen: boolean;
  title: string;
  progress: number;
  total: number;
  phaseLabel?: string | null;
  isCancelling: boolean;
  onCancel: () => void;
};

export default function PdfExportProgressModal({
  isOpen,
  title,
  progress,
  total,
  phaseLabel,
  isCancelling,
  onCancel,
}: PdfExportProgressModalProps) {
  const { t } = useI18n();
  if (!isOpen) return null;

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      contentClassName={styles.stockpileOverlayPanel}
      keepMounted
    >
      <div className="d-flex flex-column gap-3">
        {phaseLabel ? <div className={styles.exportProgressLabel}>{phaseLabel}</div> : null}
        <ProgressBar
          percent={percent}
          trackClassName={styles.exportProgressTrack}
          fillClassName={styles.exportProgressFill}
        />
        <div className={styles.exportProgressLabel}>
          {progress} / {total}
        </div>
      </div>
      <div className={styles.stockpileOverlayActions}>
        <ActionBar
          right={
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={isCancelling}
              onClick={onCancel}
            >
              {isCancelling ? t("actions.cancelling") : t("actions.cancel")}
            </button>
          }
        />
      </div>
    </ModalShell>
  );
}
