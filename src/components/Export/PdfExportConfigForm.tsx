"use client";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import type { DuplexPreset, PrintConfig } from "@/lib/pdf-export";

type PdfExportConfigFormProps = {
  config: PrintConfig;
  onChange: (next: PrintConfig) => void;
};

export default function PdfExportConfigForm({ config, onChange }: PdfExportConfigFormProps) {
  const { t } = useI18n();

  const setDuplex = (value: DuplexPreset) => {
    onChange({ ...config, duplexPreset: value });
  };

  return (
    <div className={`${styles.settingsGroup} ${styles.pdfExportGrid}`}>
      <label className="form-label" htmlFor="pdf-mode">
        {t("decks.pdf.mode")}
      </label>
      <select
        id="pdf-mode"
        className="form-select form-select-sm"
        value={config.mode}
        onChange={(event) =>
          onChange({
            ...config,
            mode: event.target.value as PrintConfig["mode"],
          })
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
          onChange({ ...config, paper: event.target.value as PrintConfig["paper"] })
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
          onChange({
            ...config,
            orientation: event.target.value as PrintConfig["orientation"],
          })
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
            onChange({
              ...config,
              marginsMm: { ...config.marginsMm, top: Number(event.target.value) || 0 },
            })
          }
        />
        <input
          type="number"
          className="form-control form-control-sm"
          min={0}
          value={config.marginsMm.right}
          onChange={(event) =>
            onChange({
              ...config,
              marginsMm: { ...config.marginsMm, right: Number(event.target.value) || 0 },
            })
          }
        />
        <input
          type="number"
          className="form-control form-control-sm"
          min={0}
          value={config.marginsMm.bottom}
          onChange={(event) =>
            onChange({
              ...config,
              marginsMm: { ...config.marginsMm, bottom: Number(event.target.value) || 0 },
            })
          }
        />
        <input
          type="number"
          className="form-control form-control-sm"
          min={0}
          value={config.marginsMm.left}
          onChange={(event) =>
            onChange({
              ...config,
              marginsMm: { ...config.marginsMm, left: Number(event.target.value) || 0 },
            })
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
            onChange({
              ...config,
              gapMm: { ...config.gapMm, x: Number(event.target.value) || 0 },
            })
          }
        />
        <input
          type="number"
          className="form-control form-control-sm"
          min={0}
          step="0.1"
          value={config.gapMm.y}
          onChange={(event) =>
            onChange({
              ...config,
              gapMm: { ...config.gapMm, y: Number(event.target.value) || 0 },
            })
          }
        />
      </div>

      <label className="form-label" htmlFor="pdf-card-width">
        Card size (mm)
      </label>
      <div className={styles.pdfExportInlineGrid2}>
        <input
          id="pdf-card-width"
          type="number"
          className="form-control form-control-sm"
          min={1}
          step="0.1"
          value={config.cardMm.width}
          onChange={(event) =>
            onChange({
              ...config,
              cardMm: { ...config.cardMm, width: Number(event.target.value) || 1 },
            })
          }
        />
        <input
          type="number"
          className="form-control form-control-sm"
          min={1}
          step="0.1"
          value={config.cardMm.height}
          onChange={(event) =>
            onChange({
              ...config,
              cardMm: { ...config.cardMm, height: Number(event.target.value) || 1 },
            })
          }
        />
      </div>

      <label className="form-label" htmlFor="pdf-bleed-mode">
        PDF bleed source
      </label>
      <select
        id="pdf-bleed-mode"
        className="form-select form-select-sm"
        value={config.bleedMode}
        onChange={(event) =>
          onChange({
            ...config,
            bleedMode: event.target.value as PrintConfig["bleedMode"],
          })
        }
      >
        <option value="bakedInImage">Image includes bleed</option>
        <option value="layoutBleed">Image has no bleed (trim only)</option>
      </select>

      <label className="form-label" htmlFor="pdf-bleed-mm">
        Bleed per edge (mm)
      </label>
      <input
        id="pdf-bleed-mm"
        type="number"
        className="form-control form-control-sm"
        min={0}
        step="0.1"
        value={config.bleedMm ?? 0}
        onChange={(event) =>
          onChange({
            ...config,
            bleedMm: Math.max(0, Number(event.target.value) || 0),
          })
        }
      />

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
  );
}
