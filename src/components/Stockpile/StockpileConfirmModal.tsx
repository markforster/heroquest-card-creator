"use client";

import ConfirmModal from "@/components/Modals/ConfirmModal";

import type { ReactNode } from "react";

type StockpileConfirmModalProps = {
  confirmDialog:
    | {
        title: string;
        body: ReactNode;
        confirmLabel?: string;
        extraLabel?: string;
        onConfirm: () => Promise<void> | void;
        onExtra?: () => Promise<void> | void;
      }
    | null;
  onCancel: () => void;
};

export default function StockpileConfirmModal({
  confirmDialog,
  onCancel,
}: StockpileConfirmModalProps) {
  return (
    <ConfirmModal
      isOpen={Boolean(confirmDialog)}
      title={confirmDialog?.title ?? ""}
      confirmLabel={confirmDialog?.confirmLabel}
      extraLabel={confirmDialog?.extraLabel}
      onConfirm={() => confirmDialog?.onConfirm()}
      onExtra={confirmDialog?.onExtra}
      onCancel={onCancel}
    >
      {confirmDialog?.body ?? ""}
    </ConfirmModal>
  );
}
