"use client";

import styles from "@/app/page.module.css";
import type { PendingReplaceState } from "@/components/Assets/AssetsInspector.types";
import { WarningNotice } from "@/components/common/Notice";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

import { useId } from "react";

type AssetsReplaceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isReplacing: boolean;
  previewUrl: string | null;
  assetName: string;
  pendingReplace: PendingReplaceState | null;
  pendingMismatch: boolean;
  originalResolution: string;
  replacementResolution: string;
  originalSize: string;
  replacementSize: string;
  fileType: string;
  replacementType: string;
  keepBackup: boolean;
  onKeepBackupChange: (checked: boolean) => void;
};

export default function AssetsReplaceModal({
  isOpen,
  onClose,
  onConfirm,
  isReplacing,
  previewUrl,
  assetName,
  pendingReplace,
  pendingMismatch,
  originalResolution,
  replacementResolution,
  originalSize,
  replacementSize,
  fileType,
  replacementType,
  keepBackup,
  onKeepBackupChange,
}: AssetsReplaceModalProps) {
  const { t } = useI18n();
  const keepBackupId = useId();

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.replaceImage")}
      contentClassName={styles.assetsReplacePopover}
      footer={
        <div className="d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onClose}
            disabled={isReplacing}
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onConfirm}
            disabled={isReplacing}
          >
            {t("actions.replace")}
          </button>
        </div>
      }
    >
      <div className={styles.assetsOptimizeBody}>
        <div className={styles.assetsReplaceLayout}>
          <div className={styles.assetsReplacePanel}>
            <div className={styles.assetsReplaceLabel}>{t("label.original")}</div>
            <div className={styles.assetsReplaceFrame}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={assetName} className={styles.assetsReplaceImage} />
              ) : (
                <div className={styles.assetsReplacePlaceholder}>{t("empty.noPreview")}</div>
              )}
            </div>
          </div>
          <div className={styles.assetsReplacePanel}>
            <div className={styles.assetsReplaceLabel}>{t("label.replacement")}</div>
            <div className={styles.assetsReplaceFrame}>
              {pendingReplace?.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pendingReplace.previewUrl}
                  alt={assetName}
                  className={styles.assetsReplaceImage}
                />
              ) : (
                <div className={styles.assetsReplacePlaceholder}>{t("empty.noPreview")}</div>
              )}
            </div>
          </div>
          <aside className={styles.assetsReplaceSidebar}>
            {pendingMismatch ? (
              <WarningNotice className="mb-0" role="status">
                {t("confirm.replaceDifferentDimensionsBody")
                  .replace("{old}", originalResolution)
                  .replace("{next}", replacementResolution)}
              </WarningNotice>
            ) : (
              <div className={styles.assetsInspectorReplaceInfo}>
                {t("confirm.replaceBody")}
              </div>
            )}
            <div className={styles.assetsReplaceSummary}>
              <div>
                {t("label.originalResolution")}: {originalResolution}
              </div>
              <div>
                {t("label.replacementResolution")}: {replacementResolution}
              </div>
              <div>
                {t("label.originalSize")}: {originalSize}
              </div>
              <div>
                {t("label.replacementSize")}: {replacementSize}
              </div>
              <div>
                {t("label.fileType")}: {fileType}
              </div>
              <div>
                {t("label.replacementType")}: {replacementType}
              </div>
            </div>
            <div className={styles.assetsInspectorReplaceToggle}>
              <input
                id={keepBackupId}
                type="checkbox"
                className="form-check-input hq-checkbox"
                checked={keepBackup}
                onChange={(event) => onKeepBackupChange(event.target.checked)}
                disabled={isReplacing}
              />
              <label
                htmlFor={keepBackupId}
                className={styles.assetsInspectorReplaceToggleLabel}
              >
                {t("label.keepBackup")}
              </label>
            </div>
          </aside>
        </div>
      </div>
    </ModalShell>
  );
}
