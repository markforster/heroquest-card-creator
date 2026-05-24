"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import PdfExportConfigForm from "@/components/Export/PdfExportConfigForm";
import ActionBar from "@/components/common/ActionBar";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

import type { PrintConfig } from "@/lib/pdf-export";

type DeckPdfExportModalProps = {
  isOpen: boolean;
  initialConfig: PrintConfig;
  onCancel: () => void;
  onConfirm: (config: PrintConfig) => void;
};

export default function DeckPdfExportModal({
  isOpen,
  initialConfig,
  onCancel,
  onConfirm,
}: DeckPdfExportModalProps) {
  const { t } = useI18n();
  const [config, setConfig] = useState<PrintConfig>(initialConfig);
  useEffect(() => {
    if (isOpen) {
      setConfig(initialConfig);
    }
  }, [initialConfig, isOpen]);

  const canConfirm = useMemo(() => {
    return config.cardMm.width > 0 && config.cardMm.height > 0;
  }, [config]);

  const resetFromInitial = () => setConfig(initialConfig);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => {
        resetFromInitial();
        onCancel();
      }}
      title={t("decks.pdf.modal.title")}
      contentClassName={`${styles.settingsPopover} ${styles.confirmPopover}`}
      footer={
        <ActionBar
          right={
            <>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={() => {
                  resetFromInitial();
                  onCancel();
                }}
              >
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!canConfirm}
                onClick={() => onConfirm(config)}
              >
                {t("actions.confirm")}
              </button>
            </>
          }
        />
      }
    >
      <PdfExportConfigForm config={config} onChange={setConfig} />
    </ModalShell>
  );
}
