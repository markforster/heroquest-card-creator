"use client";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

import type { ReactNode } from "react";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  extraLabel?: string;
  onConfirm: () => void;
  onExtra?: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  isExtraConfirming?: boolean;
};

export default function ConfirmModal({
  isOpen,
  title,
  children,
  confirmLabel,
  cancelLabel,
  extraLabel,
  onConfirm,
  onExtra,
  onCancel,
  isConfirming = false,
  isExtraConfirming = false,
}: ConfirmModalProps) {
  const { t } = useI18n();
  const confirmLabelText = confirmLabel ?? t("actions.confirm");
  const cancelLabelText = cancelLabel ?? t("actions.cancel");

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      contentClassName={styles.confirmPopover}
      footer={
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
            {cancelLabelText}
          </button>
          {extraLabel && onExtra ? (
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={onExtra}
              disabled={isExtraConfirming}
            >
              {extraLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {confirmLabelText}
          </button>
        </div>
      }
    >
      {children}
    </ModalShell>
  );
}
