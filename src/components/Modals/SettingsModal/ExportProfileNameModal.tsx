"use client";

import { useEffect, useState } from "react";

import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";

type ExportProfileNameModalProps = {
  isOpen: boolean;
  title: string;
  confirmLabel: string;
  initialValue?: string;
  validateName: (name: string) => string | null;
  onConfirm: (name: string) => Promise<void> | void;
  onCancel: () => void;
};

export default function ExportProfileNameModal({
  isOpen,
  title,
  confirmLabel,
  initialValue = "",
  validateName,
  onConfirm,
  onCancel,
}: ExportProfileNameModalProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValue(initialValue);
    setError(null);
    setIsConfirming(false);
  }, [initialValue, isOpen]);

  const handleConfirm = async () => {
    const trimmed = value.trim();
    const validationError = validateName(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      title={title}
      confirmLabel={confirmLabel}
      onConfirm={handleConfirm}
      onCancel={onCancel}
      isConfirming={isConfirming}
    >
      <div className="d-flex flex-column gap-3">
        <label className="d-flex flex-column gap-2">
          <span className="form-label mb-0">{t("form.name")}</span>
          <input
            type="text"
            className="form-control form-control-sm"
            value={value}
            autoFocus
            onChange={(event) => {
              setValue(event.target.value);
              if (error) {
                setError(null);
              }
            }}
          />
        </label>
        {error ? <div className="text-danger small">{error}</div> : null}
      </div>
    </ConfirmModal>
  );
}
