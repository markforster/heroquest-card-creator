"use client";

import styles from "@/app/page.module.css";
import type { UploadScanReportItem } from "@/types/asset-duplicates";

type UploadProgressOverlayProps = {
  isOpen: boolean;
  phaseLabel: string;
  currentFileName?: string | null;
  completed: number;
  total: number;
  isIndeterminate: boolean;
  skippedCount: number;
  errorCount: number;
  renamedCount: number;
  uploadedCount: number;
  duplicateCount: number;
  isComplete: boolean;
  review?: {
    duplicates: UploadScanReportItem[];
    renames: Array<{ original: string; renamed: string }>;
  } | null;
  onReviewContinue?: () => void;
  onReviewCancel?: () => void;
  onClose?: () => void;
};

export default function UploadProgressOverlay({
  isOpen,
  phaseLabel,
  currentFileName,
  completed,
  total,
  isIndeterminate,
  skippedCount,
  errorCount,
  renamedCount,
  uploadedCount,
  duplicateCount,
  isComplete,
  review,
  onReviewContinue,
  onReviewCancel,
  onClose,
}: UploadProgressOverlayProps) {
  if (!isOpen) return null;

  const percent =
    isIndeterminate || total === 0 ? 100 : Math.round((completed / total) * 100);
  const hasReview =
    Boolean(review && (review.duplicates.length > 0 || review.renames.length > 0));
  const summaryParts = [
    renamedCount > 0 ? `Renamed: ${renamedCount}` : null,
    skippedCount > 0 ? `Skipped: ${skippedCount}` : null,
    errorCount > 0 ? `Errors: ${errorCount}` : null,
  ].filter(Boolean);
  const summaryRows = [
    { label: "Total files", value: total },
    { label: "Uploaded", value: uploadedCount },
    { label: "Duplicates skipped", value: duplicateCount },
    { label: "Renamed", value: renamedCount },
    ...(errorCount > 0 ? [{ label: "Errors", value: errorCount }] : []),
  ];

  return (
    <div className={styles.stockpileOverlayBackdrop}>
      <div className={`${styles.stockpileOverlayPanel} ${styles.uploadProgressPanel}`}>
        <div className={styles.stockpileOverlayHeader}>
          <h3 className={styles.stockpileOverlayTitle}>Upload Progress</h3>
        </div>
        <div className="d-flex flex-column gap-2">
          <div>{phaseLabel}</div>
          {currentFileName ? (
            <div className={styles.uploadProgressFilename} title={currentFileName}>
              Current file: {currentFileName}
            </div>
          ) : null}
          {isComplete ? (
            <div className={styles.assetsReportList}>
              {summaryRows.map((row) => (
                <div key={row.label} className={styles.assetsReportItem}>
                  <div className={styles.assetsReportName}>{row.label}</div>
                  <div className={styles.assetsReportStatus}>{row.value}</div>
                </div>
              ))}
            </div>
          ) : hasReview && review ? (
            <>
              {review.duplicates.length > 0 ? (
                <div className={styles.assetsReportIntro}>
                  {review.duplicates.length} file
                  {review.duplicates.length === 1 ? "" : "s"} matched existing uploads or
                  duplicates in this batch and will be skipped.
                </div>
              ) : null}
              {review.renames.length > 0 ? (
                <div className={styles.assetsReportIntro}>
                  {review.renames.length} file
                  {review.renames.length === 1 ? "" : "s"} will be renamed to avoid filename
                  collisions.
                </div>
              ) : null}
              <div className={styles.assetsReportList}>
                {review.duplicates.length > 0 ? (
                  <>
                    {review.duplicates.map((item) => (
                      <div
                        key={`${item.fileIndex}-${item.file.name}`}
                        className={styles.assetsReportItem}
                      >
                        <div className={styles.assetsReportName}>{item.file.name}</div>
                        <div className={styles.assetsReportStatus}>
                          {item.status === "duplicate-existing"
                            ? "Already in library"
                            : "Duplicate in batch"}
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}
                {review.renames.length > 0 ? (
                  <>
                    {review.renames.map((item) => (
                      <div
                        key={`${item.original}-${item.renamed}`}
                        className={styles.assetsReportItem}
                      >
                        <div className={styles.assetsReportName}>{item.original}</div>
                        <div className={styles.assetsReportRename}>{item.renamed}</div>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
            </>
          ) : null}
          {!hasReview && !isComplete ? (
            <>
              <div className={styles.exportProgressTrack} aria-hidden="true">
                <div
                  className={styles.exportProgressFill}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className={styles.exportProgressLabel}>
                {isIndeterminate ? "Working..." : `${completed} / ${total}`}
              </div>
              {summaryParts.length > 0 ? <div>{summaryParts.join(" · ")}</div> : null}
            </>
          ) : null}
        </div>
        {isComplete && onClose ? (
          <div className={styles.stockpileOverlayActions}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : review && onReviewContinue && onReviewCancel ? (
          <div className={styles.stockpileOverlayActions}>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onReviewCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onReviewContinue}
            >
              Continue
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
