"use client";

import { useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

import type { DuplexPreset, PrintConfig } from "@/lib/pdf-export";

type DeckPdfExportModalProps = {
  isOpen: boolean;
  isExporting: boolean;
  onCancel: () => void;
  onExport: (config: PrintConfig) => Promise<void>;
  onExportAlignmentTest: (config: PrintConfig) => Promise<void>;
};

const DEFAULT_CONFIG: PrintConfig = {
  paper: "A4",
  orientation: "landscape",
  marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
  gapMm: { x: 0.5, y: 0.5 },
  cardMm: { width: 63.5, height: 89 },
  mode: "frontAndBack",
  bleedMode: "bakedInImage",
  duplexPreset: "mirrorX",
};

export default function DeckPdfExportModal({
  isOpen,
  isExporting,
  onCancel,
  onExport,
  onExportAlignmentTest,
}: DeckPdfExportModalProps) {
  const { t } = useI18n();
  const [config, setConfig] = useState<PrintConfig>(DEFAULT_CONFIG);

  const canExport = useMemo(() => {
    return config.cardMm.width > 0 && config.cardMm.height > 0;
  }, [config]);

  const setDuplex = (value: DuplexPreset) => {
    setConfig((prev) => ({ ...prev, duplexPreset: value }));
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={t("decks.pdf.modal.title")}
      contentClassName={`${styles.settingsPopover} ${styles.confirmPopover}`}
      footer={
        <ActionBar
          right={
            <>
              <button type="button" className="btn btn-outline-light btn-sm" onClick={onCancel}>
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                disabled={isExporting || !canExport}
                onClick={() => void onExportAlignmentTest(config)}
              >
                {t("decks.pdf.modal.exportAlignmentTest")}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={isExporting || !canExport}
                onClick={() => void onExport(config)}
              >
                {isExporting ? t("actions.exporting") : t("decks.pdf.modal.export")}
              </button>
            </>
          }
        />
      }
    >
      <div className={`${styles.settingsGroup} ${styles.pdfExportGrid}`}>
        <label className="form-label" htmlFor="pdf-mode">
          {t("decks.pdf.mode")}
        </label>
        <select
          id="pdf-mode"
          className="form-select form-select-sm"
          value={config.mode}
          onChange={(event) =>
            setConfig((prev) => ({
              ...prev,
              mode: event.target.value as PrintConfig["mode"],
            }))
          }
        >
          <option value="frontsOnly">{t("decks.pdf.mode.fronts")}</option>
          <option value="frontAndBack">{t("decks.pdf.mode.frontBack")}</option>
        </select>

        <label className="form-label" htmlFor="pdf-paper">
          {t("decks.pdf.paper")}
        </label>
        <select
          id="pdf-paper"
          className="form-select form-select-sm"
          value={config.paper}
          onChange={(event) =>
            setConfig((prev) => ({ ...prev, paper: event.target.value as PrintConfig["paper"] }))
          }
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
        </select>

        <label className="form-label" htmlFor="pdf-orientation">
          {t("decks.pdf.orientation")}
        </label>
        <select
          id="pdf-orientation"
          className="form-select form-select-sm"
          value={config.orientation}
          onChange={(event) =>
            setConfig((prev) => ({
              ...prev,
              orientation: event.target.value as PrintConfig["orientation"],
            }))
          }
        >
          <option value="portrait">{t("decks.pdf.orientation.portrait")}</option>
          <option value="landscape">{t("decks.pdf.orientation.landscape")}</option>
        </select>

        <label className="form-label" htmlFor="pdf-margin-top">
          {t("decks.pdf.margins")}
        </label>
        <div className={styles.pdfExportInlineGrid}>
          <input
            id="pdf-margin-top"
            type="number"
            className="form-control form-control-sm"
            min={0}
            value={config.marginsMm.top}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                marginsMm: { ...prev.marginsMm, top: Number(event.target.value) || 0 },
              }))
            }
          />
          <input
            type="number"
            className="form-control form-control-sm"
            min={0}
            value={config.marginsMm.right}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                marginsMm: { ...prev.marginsMm, right: Number(event.target.value) || 0 },
              }))
            }
          />
          <input
            type="number"
            className="form-control form-control-sm"
            min={0}
            value={config.marginsMm.bottom}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                marginsMm: { ...prev.marginsMm, bottom: Number(event.target.value) || 0 },
              }))
            }
          />
          <input
            type="number"
            className="form-control form-control-sm"
            min={0}
            value={config.marginsMm.left}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                marginsMm: { ...prev.marginsMm, left: Number(event.target.value) || 0 },
              }))
            }
          />
        </div>

        <label className="form-label" htmlFor="pdf-gap-x">
          {t("decks.pdf.gap")}
        </label>
        <div className={styles.pdfExportInlineGrid2}>
          <input
            id="pdf-gap-x"
            type="number"
            className="form-control form-control-sm"
            min={0}
            step="0.1"
            value={config.gapMm.x}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                gapMm: { ...prev.gapMm, x: Number(event.target.value) || 0 },
              }))
            }
          />
          <input
            type="number"
            className="form-control form-control-sm"
            min={0}
            step="0.1"
            value={config.gapMm.y}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                gapMm: { ...prev.gapMm, y: Number(event.target.value) || 0 },
              }))
            }
          />
        </div>

        {config.mode === "frontAndBack" ? (
          <>
            <label className="form-label" htmlFor="pdf-duplex">
              {t("decks.pdf.duplex")}
            </label>
            <select
              id="pdf-duplex"
              className="form-select form-select-sm"
              value={config.duplexPreset ?? "normal"}
              onChange={(event) => setDuplex(event.target.value as DuplexPreset)}
            >
              <option value="normal">{t("decks.pdf.duplex.normal")}</option>
              <option value="mirrorX">{t("decks.pdf.duplex.mirrorX")}</option>
              <option value="rotate180">{t("decks.pdf.duplex.rotate180")}</option>
              <option value="mirrorXRotate180">{t("decks.pdf.duplex.mirrorXRotate180")}</option>
            </select>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
