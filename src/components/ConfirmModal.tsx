"use client";

import type { ReactNode } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
};

export default function ConfirmModal({
  isOpen,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isConfirming = false,
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
