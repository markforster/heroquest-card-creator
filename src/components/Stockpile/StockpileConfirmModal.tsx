"use client";

import ConfirmModal from "@/components/Modals/ConfirmModal";

type StockpileConfirmModalProps = {
  confirmDialog:
    | {
        title: string;
        body: string;
        confirmLabel?: string;
        onConfirm: () => Promise<void> | void;
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
      onConfirm={() => confirmDialog?.onConfirm()}
      onCancel={onCancel}
    >
      {confirmDialog?.body ?? ""}
    </ConfirmModal>
  );
}
