"use client";

import styles from "@/app/page.module.css";
import { useModalEscape } from "@/components/common/ModalShell/useModalEscape";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useI18n } from "@/i18n/I18nProvider";

import { useMemo, useRef, useState } from "react";

import type { DuplexPreset } from "@/lib/pdf-export";

type PdfDuplexPresetFieldProps = {
  disabled?: boolean;
  value: DuplexPreset;
  onChange: (next: DuplexPreset) => void;
};

export default function PdfDuplexPresetField({
  disabled = false,
  value,
  onChange,
}: PdfDuplexPresetFieldProps) {
  const { t } = useI18n();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const helpPopoverId = useMemo(
    () => `pdf-duplex-help-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  useOutsideClick([buttonRef, popoverRef], () => setIsHelpOpen(false), isHelpOpen);
  useModalEscape({ isOpen: isHelpOpen, onClose: () => setIsHelpOpen(false) });

  const helpItems: DuplexPreset[] = ["normal", "mirrorX", "rotate180", "mirrorXRotate180"];

  return (
    <div className={`${styles.pdfExportField} ${styles.pdfExportFieldDuplex}`}>
      <div className={styles.pdfDuplexFieldHeader}>
        <label className={styles.pdfExportFieldLabel} htmlFor="pdf-duplex">
          {t("decks.pdf.duplex" as never)}
        </label>
        <div className={styles.pdfDuplexHelp}>
          <button
            ref={buttonRef}
            type="button"
            className={styles.pdfDuplexHelpButton}
            aria-label={t("label.moreInfo" as never)}
            aria-expanded={isHelpOpen}
            aria-controls={helpPopoverId}
            onClick={() => setIsHelpOpen((open) => !open)}
          >
            i
          </button>
          {isHelpOpen ? (
            <div
              id={helpPopoverId}
              ref={popoverRef}
              role="dialog"
              aria-label={t("decks.pdf.duplex.helpTitle" as never)}
              className={styles.pdfDuplexHelpPopover}
            >
              <div className={styles.pdfDuplexHelpPopoverTitle}>
                {t("decks.pdf.duplex.helpTitle" as never)}
              </div>
              <div className={styles.pdfDuplexHelpList}>
                {helpItems.map((preset) => (
                  <div key={preset} className={styles.pdfDuplexHelpItem}>
                    <div className={styles.pdfDuplexHelpItemLabel}>
                      {t(`decks.pdf.duplex.${preset}` as never)}
                    </div>
                    <div className={styles.pdfDuplexHelpItemText}>
                      {t(`decks.pdf.duplex.help.${preset}` as never)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <select
        id="pdf-duplex"
        className="form-select form-select-sm"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value as DuplexPreset)}
      >
        <option value="normal">{t("decks.pdf.duplex.normal" as never)}</option>
        <option value="mirrorX">{t("decks.pdf.duplex.mirrorX" as never)}</option>
        <option value="rotate180">{t("decks.pdf.duplex.rotate180" as never)}</option>
        <option value="mirrorXRotate180">{t("decks.pdf.duplex.mirrorXRotate180" as never)}</option>
      </select>
    </div>
  );
}
