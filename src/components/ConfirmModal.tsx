"use client";

import type { ReactNode } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/ModalShell";

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
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      contentClassName={styles.confirmPopover}
      footer={
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      {children}
    </ModalShell>
  );
}
