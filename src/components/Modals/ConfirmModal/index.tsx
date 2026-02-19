"use client";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

import CancelButton from "./CancelButton";
import ConfirmButton from "./ConfirmButton";

import type { ReactNode } from "react";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  extraLabel?: string;
  contentClassName?: string;
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
  contentClassName,
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
      contentClassName={`${styles.confirmPopover}${contentClassName ? ` ${contentClassName}` : ""}`}
      footer={
        <ActionBar
          right={
            <>
              <CancelButton label={cancelLabelText} onCancel={onCancel} />
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
              <ConfirmButton
                label={confirmLabelText}
                onConfirm={onConfirm}
                isConfirming={isConfirming}
              />
            </>
          }
        />
      }
    >
      {children}
    </ModalShell>
  );
}
