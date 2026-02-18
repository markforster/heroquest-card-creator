"use client";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import ProgressBar from "@/components/common/ProgressBar";
import ModalShell from "@/components/common/ModalShell";

type ExportProgressOverlayProps = {
  isOpen: boolean;
  title: string;
  progress: number;
  total: number;
  cancelLabel: string;
  cancelDisabled?: boolean;
  onCancel: () => void;
};

export default function ExportProgressOverlay({
  isOpen,
  title,
  progress,
  total,
  cancelLabel,
  cancelDisabled = false,
  onCancel,
}: ExportProgressOverlayProps) {
  if (!isOpen) {
    return null;
  }

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;

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
